import React, { useRef, useState } from 'react';
import { ProgressBar } from 'react-bootstrap';
import Worker from './worker.ts?worker';
import { JsonFileLoader } from './JsonFileLoader';
import { serverURL } from '../../../constants';

// ─────────────────────────────────────────────────────────
// Storage: all primes live in a pair of Uint32Arrays —
// one for prime values, one for periods.  At 1B there are
// ~50M primes; typed arrays use 4 bytes/value = ~400 MB,
// vs ~1.8 GB for JS [prime, period] object arrays.
// ─────────────────────────────────────────────────────────
interface Store {
    primes:  Uint32Array;   // prime values
    periods: Uint32Array;   // decimal periods (same index)
    count:   number;        // populated entries
}

const SEED: [number, number][] = [
    [2, 0], [5, 0], [7, 6], [11, 2], [13, 6], [17, 16], [19, 18],
    [23, 22], [29, 28], [31, 30], [37, 36], [41, 40], [43, 42],
    [47, 46], [53, 52], [59, 58], [61, 60],
];

function buildSeed(): Store {
    const primes  = new Uint32Array(SEED.length);
    const periods = new Uint32Array(SEED.length);
    SEED.forEach(([p, d], i) => { primes[i] = p; periods[i] = d; });
    return { primes, periods, count: SEED.length };
}

// Grow a typed array to at least newLen, preserving existing data.
function growIfNeeded(arr: Uint32Array, need: number): Uint32Array {
    if (arr.length >= need) return arr;
    let cap = arr.length;
    while (cap < need) cap *= 2;
    const next = new Uint32Array(cap);
    next.set(arr);
    return next;
}

const TARGET_OPTIONS = [
    { label: '10 million',  value: 10_000_000  },
    { label: '100 million', value: 100_000_000 },
    { label: '500 million', value: 500_000_000 },
    { label: '1 billion',   value: 1_000_000_000 },
];

// Pre-calculate total worker chunks across all sieve phases so the
// progress bar runs 0→100% exactly once rather than resetting each phase.
// Each phase ends at min(lastPrime², max); we approximate lastPrime ≈ phaseEnd.
function estimateTotalChunks(startPrime: number, max: number, chunkSize: number): number {
    let total = 0;
    let lp = startPrime;
    let to = Math.min(lp * lp, max);
    do {
        total += Math.ceil((to - lp) / chunkSize);
        if (to === max) break;
        lp = to;                          // approximate: last found prime ≈ phase end
        to = Math.min(lp * lp, max);
    } while (true);
    return Math.max(total, 1);
}

// ─────────────────────────────────────────────────────────
// Parallel sieve.  Key optimisations vs previous version:
//
//  1. Only sieve primes up to √to are sent to each worker
//     (~2 500 values for a 500 M target vs 5.76 M items).
//  2. Workers return transferable Uint32Arrays (zero-copy).
//  3. Chunks are stored by index so final merge is a simple
//     TypedArray.set() in order — no sort needed.
//  4. The main Store is mutated in-place with growIfNeeded,
//     avoiding full-array copies each iteration.
//  5. Total chunk count is pre-calculated across all phases
//     so progress is reported as a single 0→N counter.
// ─────────────────────────────────────────────────────────
async function runInParallel(
    max:        number,
    store:      Store,
    onProgress: (done: number, total: number) => void,
): Promise<Store> {
    // Work in-place on the store
    let { primes, periods, count } = store;

    const lastPrime = () => primes[count - 1];
    let to = lastPrime() ** 2;
    if (to > max) to = max;

    const chunkSize = 5_000_000;

    // Pre-calculate the grand total so onProgress counts up once to this value.
    const grandTotal = estimateTotalChunks(lastPrime(), max, chunkSize);
    let globalDone   = 0;
    onProgress(0, grandTotal);

    do {
        // Build sieve array: only prime VALUES up to √to.
        // Workers use these for trial division and never need more.
        const sqrtTo = Math.ceil(Math.sqrt(to));
        let sieveLen = 0;
        while (sieveLen < count && primes[sieveLen] <= sqrtTo) sieveLen++;
        const sieve = primes.slice(0, sieveLen); // copy of just the values we need

        const offset      = lastPrime() + 2;
        const totalChunks = Math.ceil((to - lastPrime()) / chunkSize);
        const concurrency = Math.min(navigator.hardwareConcurrency || 4, totalChunks);
        let completed     = 0;
        let nextIdx       = 0;

        // One slot per chunk; filled as workers finish.
        const chunks = new Array<Uint32Array>(totalChunks);

        const newData: Uint32Array = await new Promise((resolve) => {
            const startTask = (taskIdx: number) => {
                const worker = new Worker();
                let done = false;

                const finish = () => {
                    if (done) return;
                    done = true;
                    completed++;
                    globalDone++;
                    onProgress(globalDone, grandTotal);

                    if (nextIdx < totalChunks) {
                        startTask(nextIdx++);
                    } else if (completed === totalChunks) {
                        // Merge chunks in index order — no sort needed because
                        // each chunk covers a non-overlapping sorted range.
                        let total = 0;
                        for (const c of chunks) total += c.length;
                        const merged = new Uint32Array(total);
                        let pos = 0;
                        for (const c of chunks) { merged.set(c, pos); pos += c.length; }
                        resolve(merged);
                    }
                };

                worker.addEventListener('message', (e) => {
                    if (e.data.type === 'complete') {
                        // data is an interleaved Uint32Array [p0,d0,p1,d1,…]
                        // transferred (zero-copy) from the worker
                        chunks[taskIdx] = e.data.results.data as Uint32Array;
                        worker.terminate();
                        finish();
                    }
                });
                worker.addEventListener('error', () => { worker.terminate(); finish(); });

                const start = offset + taskIdx * chunkSize;
                let   end   = offset + (taskIdx + 1) * chunkSize - 2;
                if (end > to) end = to;
                // sieve is a copy so safe to share across workers
                worker.postMessage([sieve, sieveLen, start, end]);
            };

            for (let i = 0; i < concurrency && i < totalChunks; i++) startTask(nextIdx++);
        });

        // newData is interleaved [p0,d0,p1,d1,…] — unpack into store
        const newCount = newData.length / 2;
        primes  = growIfNeeded(primes,  count + newCount);
        periods = growIfNeeded(periods, count + newCount);
        for (let i = 0; i < newCount; i++) {
            primes [count + i] = newData[i * 2];
            periods[count + i] = newData[i * 2 + 1];
        }
        count += newCount;

        if (to === max) break;
        to = lastPrime() ** 2;
        if (to > max) to = max;
    } while (true);

    return { primes, periods, count };
}

// ─────────────────────────────────────────────────────────
// Top-100 selection — single O(n) pass, no intermediate
// objects for the full dataset.
// ─────────────────────────────────────────────────────────
interface PrimeRow { prime: number; period: number; ratio: number }

function computeTops(store: Store): { byRatio: number[][]; byPeriod: number[][] } {
    const { primes, periods, count } = store;

    const byRatio:  PrimeRow[] = [];
    const byPeriod: PrimeRow[] = [];
    let minRatio  =  0;
    let maxPeriod = -1;

    for (let i = 0; i < count; i++) {
        const p      = primes[i];
        const period = periods[i];
        if (p === 2 || p === 5 || period === 0) continue;

        const ratio = (p - 1) / period;

        // ── top-100 by ratio ──
        if (byRatio.length < 100) {
            byRatio.push({ prime: p, period, ratio });
            if (byRatio.length === 100) {
                byRatio.sort((a, b) => a.ratio - b.ratio);
                minRatio = byRatio[0].ratio;
            }
        } else if (ratio > minRatio) {
            byRatio[0] = { prime: p, period, ratio };
            let minIdx = 0;
            for (let j = 1; j < 100; j++) if (byRatio[j].ratio < byRatio[minIdx].ratio) minIdx = j;
            if (minIdx !== 0) { const t = byRatio[0]; byRatio[0] = byRatio[minIdx]; byRatio[minIdx] = t; }
            minRatio = byRatio[0].ratio;
        }

        // ── top-100 by shortest period ──
        if (byPeriod.length < 100) {
            byPeriod.push({ prime: p, period, ratio });
            if (byPeriod.length === 100) {
                byPeriod.sort((a, b) => a.period - b.period);
                maxPeriod = byPeriod[99].period;
            }
        } else if (period < maxPeriod) {
            let maxIdx = 0;
            for (let j = 1; j < 100; j++) if (byPeriod[j].period > byPeriod[maxIdx].period) maxIdx = j;
            byPeriod[maxIdx] = { prime: p, period, ratio };
            maxPeriod = 0;
            for (let j = 0; j < 100; j++) if (byPeriod[j].period > maxPeriod) maxPeriod = byPeriod[j].period;
        }
    }

    byRatio.sort( (a, b) => b.ratio  - a.ratio);
    byPeriod.sort((a, b) => a.period - b.period);

    const toRows = (arr: PrimeRow[]) => arr.map(r => [r.prime, r.period, r.ratio]);
    return { byRatio: toRows(byRatio), byPeriod: toRows(byPeriod) };
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────
export const Primes = () => {
    const storeRef = useRef<Store>(buildSeed());

    const [targetMax,  setTargetMax]  = useState(1_000_000_000);
    const [running,    setRunning]    = useState(false);
    const [progress,   setProgress]   = useState({ done: 0, total: 0 });
    const [primeCount, setPrimeCount] = useState(SEED.length);
    const [maxPrime,   setMaxPrime]   = useState(61);
    const [top100,     setTop100]     = useState<number[][]>([]);
    const [top100p,    setTop100p]    = useState<number[][]>([]);
    const [showAll,    setShowAll]    = useState(false);
    const [fullReptend, setFullReptend] = useState(0);

    const progressPct = progress.total > 0
        ? Math.round((progress.done / progress.total) * 100)
        : 0;
    const done = maxPrime >= targetMax;

    const applyStore = (store: Store) => {
        storeRef.current = store;
        const last = store.primes[store.count - 1];
        setPrimeCount(store.count);
        setMaxPrime(last);

        const { byRatio, byPeriod } = computeTops(store);
        setTop100(byRatio);
        setTop100p(byPeriod);

        // Count full-reptend primes (period = p-1)
        let fr = 0;
        for (let i = 0; i < store.count; i++) {
            if (store.periods[i] === store.primes[i] - 1 && store.periods[i] > 0) fr++;
        }
        setFullReptend(fr);
    };

    const handle = () => {
        if (running || done) return;
        setRunning(true);
        setProgress({ done: 0, total: 0 });
        runInParallel(targetMax, storeRef.current, (d, t) => setProgress({ done: d, total: t }))
            .then((store) => { applyStore(store); setRunning(false); });
    };

    const saveFile = () => {
        const { primes, periods, count } = storeRef.current;
        const rows: number[][] = [];
        for (let i = 0; i < count; i++) rows.push([primes[i], periods[i]]);
        const blob = new Blob([JSON.stringify(rows)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), { href: url, download: 'primes.json' });
        document.body.appendChild(a); a.click();
        URL.revokeObjectURL(url); document.body.removeChild(a);
    };

    const handleLoad = (data: any) => {
        // ── Summary format (from primes_summarize) ──
        if (data && data.summary === true) {
            const totalCount: number = data.count;
            const maxP:       number = data.maxPrime;
            const lim:        number = data.limit || maxP;

            const first40k: number[][] = data.first40k || [];
            const sc = first40k.length;
            const primes  = new Uint32Array(Math.max(sc, SEED.length));
            const periods = new Uint32Array(Math.max(sc, SEED.length));
            first40k.forEach(([p, d]: number[], i: number) => { primes[i] = p; periods[i] = d; });
            storeRef.current = { primes, periods, count: sc };

            setPrimeCount(totalCount);
            setMaxPrime(maxP);
            setTargetMax(lim);
            setFullReptend(data.fullReptend || 0);

            const toRows = (arr: number[][]) =>
                arr.map(([p, d]: number[]) => [p, d, d > 0 ? (p - 1) / d : 0]);
            setTop100 (toRows(data.byRatio  || []));
            setTop100p(toRows(data.byPeriod || []));
            return;
        }

        // ── Full format: [[prime, period], ...] ──
        if (!Array.isArray(data) || data.length === 0) return;
        const count   = data.length;
        const primes  = new Uint32Array(count);
        const periods = new Uint32Array(count);
        data.forEach(([p, d], i) => { primes[i] = p; periods[i] = d; });
        applyStore({ primes, periods, count });
    };

    // Extract up to `limit` rows from the store as number[][] for table rendering
    const extractRows = (limit: number): number[][] => {
        const { primes, periods, count } = storeRef.current;
        const n = Math.min(count, limit);
        const rows: number[][] = new Array(n);
        for (let i = 0; i < n; i++) {
            const p = primes[i], d = periods[i];
            rows[i] = [p, d, d > 0 ? (p - 1) / d : Infinity];
        }
        return rows;
    };

    // ── table renderer ──
    const renderTable = (data: number[][], caption: string) => {
        if (data.length === 0) return null;
        const COLS  = 4;
        const chunk = Math.ceil(data.length / COLS);
        const groups = Array.from({ length: COLS }, (_, i) =>
            data.slice(i * chunk, (i + 1) * chunk)
        );
        const maxRows = Math.max(...groups.map(g => g.length));

        return (
            <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={sectionHeadStyle}>{caption}</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: '0.78rem', width: '100%' }}>
                        <thead>
                            <tr style={{ background: '#001830', color: '#dde6f0' }}>
                                {Array.from({ length: COLS }).map((_, i) => (
                                    <React.Fragment key={i}>
                                        <th style={thStyle}>Prime</th>
                                        <th style={thStyle}>Period</th>
                                        <th style={{ ...thStyle, borderRight: i < COLS - 1 ? '2px solid rgba(245,158,11,0.5)' : undefined }}>
                                            (p−1)/period
                                        </th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: maxRows }).map((_, row) => (
                                <tr key={row} style={{ background: row % 2 === 0 ? '#f5f8fb' : '#fff' }}>
                                    {groups.map((col, ci) => {
                                        const p = col[row];
                                        if (!p) return (
                                            <React.Fragment key={ci}>
                                                <td style={tdStyle} /><td style={tdStyle} />
                                                <td style={{ ...tdStyle, borderRight: ci < COLS - 1 ? '2px solid rgba(245,158,11,0.5)' : undefined }} />
                                            </React.Fragment>
                                        );
                                        const ratio = p[2];
                                        return (
                                            <React.Fragment key={ci}>
                                                <td style={{ ...tdStyle, color: '#1a5fa8' }}>{p[0].toLocaleString()}</td>
                                                <td style={{ ...tdStyle, color: '#166534' }}>{p[1].toLocaleString()}</td>
                                                <td style={{ ...tdStyle, color: '#6b21a8', borderRight: ci < COLS - 1 ? '2px solid rgba(245,158,11,0.5)' : undefined }}>
                                                    {typeof ratio === 'number' && isFinite(ratio) ? ratio.toLocaleString() : '∞'}
                                                </td>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // ─────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────
    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>

            {/* ── Page Header ── */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <p style={eyebrowStyle}>Mathematical Exploration</p>
                <h1 style={pageTitleStyle}>Prime Decimal Periods</h1>
                <hr style={ruleStyle} />
            </div>

            {/* ── Explainer ── */}
            <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                    <span style={cardTitleStyle}>What Is Being Computed?</span>
                </div>
                <div style={cardBodyStyle}>
                    <p style={bioStyle}>
                        For every prime <em>p</em> (other than 2 and 5), the decimal expansion of
                        <strong> 1/p</strong> eventually repeats. For example,{' '}
                        <strong>1/7 = 0.<u>142857</u>…</strong> — the block "142857" repeats
                        forever, giving a <strong>period of 6</strong>. This page finds all primes
                        up to a selected limit and computes the length of that repeating block for
                        each one.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                        {[
                            {
                                term: 'Seed Primes (the starting 17)',
                                def: `The page opens pre-loaded with 17 primes from 2 to 61. These are hard-coded seeds that bootstrap the sieve — each worker chunk needs all primes up to √(chunk_end) for trial division. 61² = 3,721, so these seeds cover the first pass; that pass's results cover the next, and so on until the target is reached.`,
                            },
                            {
                                term: 'Period of p',
                                def: 'The length of the repeating decimal in 1/p. Mathematically: the multiplicative order of 10 modulo p — the smallest d dividing p−1 such that 10^d ≡ 1 (mod p). Found by checking sorted divisors of p−1 via fast modular exponentiation.',
                            },
                            {
                                term: 'Full-Reptend Prime',
                                def: 'A prime whose period equals p−1 (the maximum possible). These produce cyclic numbers. 7 is the smallest: period = 6 = 7−1, and 142857 is a famous cyclic number. The (p−1)/period ratio equals 1 for all full-reptend primes.',
                            },
                            {
                                term: '(p−1) / period',
                                def: 'How "compressed" the period is relative to the maximum. A ratio of 1 means full-reptend. A large ratio (e.g. 30) means the period is very short for the size of the prime.',
                            },
                            {
                                term: 'How It Runs',
                                def: `The browser spawns up to ${navigator.hardwareConcurrency || 4} parallel Web Workers (one per logical core). Each handles a 5-million-number chunk. Only the ~2,500 sieve primes needed for trial division (those ≤ √target) are sent to each worker — not the full accumulated list. Worker results are returned as transferable typed arrays (zero-copy).`,
                            },
                            {
                                term: 'Why Typed Arrays?',
                                def: `At 1 billion, ~50 million primes are found. Storing them as JS [prime, period] objects would use ~1.8 GB; two Uint32Arrays use ~400 MB. Workers also return Uint32Arrays transferred zero-copy, so no structured-clone overhead. This is what prevents the "Aw, Snap" crash when resuming across targets.`,
                            },
                        ].map(({ term, def }) => (
                            <div key={term} style={glossaryItemStyle}>
                                <div style={glossaryTermStyle}>{term}</div>
                                <div style={glossaryDefStyle}>{def}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Controls ── */}
            <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                    <span style={cardTitleStyle}>Computation Controls</span>
                    <span style={cardYearStyle}>
                        {primeCount.toLocaleString()} primes found · largest: {maxPrime.toLocaleString()}
                    </span>
                </div>
                <div style={cardBodyStyle}>

                    {/* Target selector */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <div style={labelStyle}>Search Limit</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {TARGET_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    disabled={running || maxPrime >= opt.value}
                                    onClick={() => setTargetMax(opt.value)}
                                    style={{
                                        ...pillBtnStyle,
                                        background: targetMax === opt.value ? '#001830' : 'transparent',
                                        color:      targetMax === opt.value ? '#f59e0b' : '#001830',
                                        opacity:    maxPrime >= opt.value ? 0.45 : 1,
                                        cursor:     running || maxPrime >= opt.value ? 'default' : 'pointer',
                                    }}
                                >
                                    {opt.label}{maxPrime >= opt.value ? ' ✓' : ''}
                                </button>
                            ))}
                        </div>
                        <div style={{ ...monoSmallStyle, marginTop: '0.4rem', color: '#6a9ac4' }}>
                            ~{Math.round(targetMax / Math.log(targetMax) / 1_000_000).toLocaleString()}M primes expected
                        </div>
                    </div>

                    {/* Status */}
                    <div style={{ ...monoSmallStyle, marginBottom: '0.75rem', color: '#6a9ac4' }}>
                        {done
                            ? `✓ Complete — all primes up to ${targetMax.toLocaleString()} computed`
                            : running
                                ? `Running… ${progress.done.toLocaleString()} of ${progress.total.toLocaleString()} chunks`
                                : maxPrime > 61
                                    ? `Resuming from ${maxPrime.toLocaleString()} → ${targetMax.toLocaleString()}`
                                    : `Ready — will find all primes up to ${targetMax.toLocaleString()}`
                        }
                    </div>

                    {/* Progress bar */}
                    {running && (
                        <div style={{ marginBottom: '1.25rem' }}>
                            <ProgressBar
                                now={progressPct} label={`${progressPct}%`}
                                animated striped
                                style={{ height: 22, borderRadius: 4, backgroundColor: '#d0dde8' }}
                            />
                            <div style={{ ...monoSmallStyle, marginTop: '0.3rem', color: '#6a9ac4' }}>
                                {progress.done.toLocaleString()} / {progress.total.toLocaleString()} chunks complete
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
                        <button onClick={handle} disabled={running || done}
                            style={{ ...runBtnStyle, opacity: running || done ? 0.5 : 1, cursor: running || done ? 'default' : 'pointer' }}>
                            {done ? '✓ Done' : running ? 'Computing…' : `Find primes up to ${targetMax.toLocaleString()}`}
                        </button>
                        <button onClick={saveFile} disabled={running || primeCount <= SEED.length} style={secondaryBtnStyle}>
                            Save to JSON
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ ...labelStyle, margin: 0 }}>Load JSON:</span>
                            <JsonFileLoader onLoad={handleLoad} />
                        </div>
                    </div>

                    {/* Stats */}
                    {primeCount > SEED.length && !running && (
                        <div style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                            {[
                                { label: 'Primes Found',             value: primeCount.toLocaleString() },
                                { label: 'Largest Prime',            value: maxPrime.toLocaleString() },
                                { label: 'Full-Reptend (ratio = 1)', value: fullReptend.toLocaleString() },
                                { label: 'Search Progress',          value: `${((maxPrime / targetMax) * 100).toFixed(2)}%` },
                            ].map(({ label, value }) => (
                                <div key={label} style={statBubbleStyle}>
                                    <div style={{ fontFamily: 'Share Tech Mono,monospace', fontSize: '1.1rem', color: '#f59e0b' }}>{value}</div>
                                    <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6a9ac4' }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Results ── */}
            {!running && primeCount > SEED.length && (
                <div style={cardStyle}>
                    <div style={cardHeaderStyle}>
                        <span style={cardTitleStyle}>Results</span>
                    </div>
                    <div style={cardBodyStyle}>
                        <p style={{ ...bioStyle, marginBottom: '1.5rem' }}>
                            The first table ranks the top 100 primes by <strong>highest (p−1)/period ratio</strong>.
                            The second ranks by <strong>shortest absolute period</strong>.
                            The third shows up to 40,000 of the {primeCount.toLocaleString()} found primes.
                            {primeCount > 40_000 && ' Use Save to JSON to access the full dataset.'}
                        </p>
                        {renderTable(top100,  'Top 100 — Highest (p−1)/Period Ratio')}
                        {renderTable(top100p, 'Top 100 — Shortest Absolute Period')}
                        <div style={{ marginBottom: '1rem' }}>
                            <button onClick={() => setShowAll(v => !v)} style={secondaryBtnStyle}>
                                {showAll ? 'Hide' : 'Show'} All Primes Table (first 40,000)
                            </button>
                        </div>
                        {showAll && renderTable(
                            extractRows(40_000),
                            `All Primes (showing first 40,000 of ${primeCount.toLocaleString()})`
                        )}
                    </div>
                </div>
            )}

            {/* ── CUDA Section ── */}
            <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                    <span style={cardTitleStyle}>CUDA Graphics Processing</span>
                    <span style={cardYearStyle}>GPU-accelerated · NVIDIA CUDA</span>
                </div>
                <div style={cardBodyStyle}>
                    <p style={bioStyle}>
                        The browser computation is limited by JavaScript's single-threaded Web Workers and available RAM.
                        For targets above 1 billion, a standalone CUDA program (<code>primes_cuda.cu</code>) runs the
                        period computation on an NVIDIA GPU — hundreds of threads simultaneously, one per prime. The CPU
                        runs a bit-packed Sieve of Eratosthenes to enumerate all primes, then transfers them to the GPU
                        in bulk. Each GPU thread independently computes the multiplicative order of 10 mod p by trial-factoring
                        p−1 and checking 10<sup>d</sup> ≡ 1 (mod p) via fast modular exponentiation. Results are copied
                        back and written as the same <code>[[prime, period], …]</code> JSON format the browser uses — so
                        GPU-generated files can be loaded directly into this page.
                    </p>

                    {/* Timing table */}
                    <div style={{ marginBottom: '1.75rem' }}>
                        <div style={sectionHeadStyle}>Run Performance</div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ borderCollapse: 'collapse', fontSize: '0.82rem', width: '100%' }}>
                                <thead>
                                    <tr style={{ background: '#001830', color: '#dde6f0' }}>
                                        {['Limit', 'Primes Found', 'Sieve (CPU)', 'GPU Compute', 'Write JSON', 'Total', 'GPU Alloc'].map(h => (
                                            <th key={h} style={{ ...thStyle, padding: '6px 10px', textAlign: h === 'Limit' || h === 'Primes Found' || h === 'GPU Alloc' ? 'left' : 'right' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { limit: '1 billion',   primes: '50,847,534',  sieve: '1.9 s',  gpu: '2.3 s',    write: '4.7 s',  total: '8.9 s',    alloc: '814 MB'    },
                                        { limit: '10 billion',  primes: '455,052,511', sieve: '27.2 s', gpu: '86.9 s',   write: '43.1 s', total: '157.2 s',  alloc: '7,281 MB'  },
                                        { limit: '20 billion',  primes: '882,206,716', sieve: '61.3 s', gpu: '388.1 s',  write: '93.2 s', total: '542.6 s',  alloc: '14,115 MB' },
                                    ].map((row, ri) => (
                                        <tr key={row.limit} style={{ background: ri % 2 === 0 ? '#f5f8fb' : '#fff' }}>
                                            <td style={{ ...tdStyle, padding: '5px 10px', color: '#f59e0b', fontWeight: 700, textAlign: 'left' }}>{row.limit}</td>
                                            <td style={{ ...tdStyle, padding: '5px 10px', color: '#1a5fa8', textAlign: 'left' }}>{row.primes}</td>
                                            <td style={{ ...tdStyle, padding: '5px 10px', textAlign: 'right' }}>{row.sieve}</td>
                                            <td style={{ ...tdStyle, padding: '5px 10px', color: '#166534', textAlign: 'right' }}>{row.gpu}</td>
                                            <td style={{ ...tdStyle, padding: '5px 10px', textAlign: 'right' }}>{row.write}</td>
                                            <td style={{ ...tdStyle, padding: '5px 10px', color: '#6b21a8', fontWeight: 700, textAlign: 'right' }}>{row.total}</td>
                                            <td style={{ ...tdStyle, padding: '5px 10px', color: '#6a9ac4', textAlign: 'left' }}>{row.alloc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ ...monoSmallStyle, marginTop: '0.4rem', color: '#6a9ac4', fontSize: '0.72rem' }}>
                            Tested on a consumer NVIDIA GPU. GPU compute time increases super-linearly beyond 10B as primes grow larger and period factorisation takes longer.
                        </div>
                    </div>

                    {/* Compile / run instructions */}
                    <div style={{ marginBottom: '1.75rem' }}>
                        <div style={sectionHeadStyle}>Compile &amp; Run</div>
                        <div style={{ background: '#001830', borderRadius: 4, padding: '1rem 1.25rem', marginBottom: '0.75rem' }}>
                            <div style={{ ...monoSmallStyle, color: '#f59e0b', fontSize: '0.75rem', marginBottom: '0.4rem' }}>COMPILE (x64 Native Tools Command Prompt for VS)</div>
                            <code style={{ fontFamily: 'Share Tech Mono,monospace', fontSize: '0.82rem', color: '#dde6f0', display: 'block' }}>
                                nvcc -O3 -o primes_cuda primes_cuda.cu
                            </code>
                        </div>
                        <div style={{ background: '#001830', borderRadius: 4, padding: '1rem 1.25rem' }}>
                            <div style={{ ...monoSmallStyle, color: '#f59e0b', fontSize: '0.75rem', marginBottom: '0.4rem' }}>RUN</div>
                            <code style={{ fontFamily: 'Share Tech Mono,monospace', fontSize: '0.82rem', color: '#dde6f0', display: 'block', whiteSpace: 'pre' }}>
{`primes_cuda.exe 1000000000 primes_1b.json
primes_cuda.exe 10000000000 primes_10b.json
primes_cuda.exe 20000000000 primes_20b.json`}
                            </code>
                        </div>
                    </div>

                    {/* Downloads */}
                    <div style={{ marginBottom: '1.75rem' }}>
                        <div style={sectionHeadStyle}>Downloads — Source &amp; Executable</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                            {[
                                { label: 'primes_cuda.cu',  href: serverURL + '/cuda/primes_cuda.cu',  desc: 'CUDA source' },
                                { label: 'primes_cuda.exe', href: serverURL + '/cuda/primes_cuda.exe', desc: 'Windows x64 executable' },
                            ].map(({ label, href, desc }) => (
                                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                                    style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: '#001830', color: '#f59e0b', border: '1.5px solid #001830', borderRadius: 4, padding: '0.45rem 1.1rem', textDecoration: 'none', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                    {label}
                                    <span style={{ fontFamily: 'Share Tech Mono,monospace', fontSize: '0.65rem', color: '#6a9ac4', fontWeight: 400, letterSpacing: '0.05em', textTransform: 'none' }}>{desc}</span>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Pre-computed JSON downloads */}
                    <div>
                        <div style={sectionHeadStyle}>Pre-computed Datasets</div>
                        <p style={{ ...bioStyle, fontSize: '0.88rem', marginBottom: '1rem' }}>
                            Click <strong>Load Results</strong> to fetch a pre-computed summary and populate the
                            tables below — top-100 rankings and first 40,000 primes, exactly as if you had run the
                            computation yourself. Summary files are small (~2 MB) and load instantly.
                        </p>

                        {[
                            { label: '1 Billion',  summary: 'primes_1b_summary.json',  primes: '50.8M' },
                            { label: '10 Billion', summary: 'primes_10b_summary.json', primes: '455M'  },
                            { label: '20 Billion', summary: 'primes_20b_summary.json', primes: '882M'  },
                        ].map(({ label, summary, primes }) => (
                            <div key={label} style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                                <span style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#001830', minWidth: 110 }}>{label}</span>
                                <span style={{ fontFamily: 'Share Tech Mono,monospace', fontSize: '0.72rem', color: '#6a9ac4', minWidth: 70 }}>{primes} primes</span>
                                <button
                                    onClick={() => {
                                        fetch(serverURL + '/cuda/' + summary)
                                            .then(r => r.json())
                                            .then(data => handleLoad(data))
                                            .catch(e => console.error('Failed to load summary:', e));
                                    }}
                                    style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: '#001830', color: '#f59e0b', border: '1.5px solid #001830', borderRadius: 4, padding: '0.35rem 0.9rem', cursor: 'pointer' }}>
                                    Load Results
                                </button>
                            </div>
                        ))}

                        <div style={{ marginBottom: '1rem' }} />
                        <div style={sectionHeadStyle}>Downloads — Summarizer Tool</div>
                        <p style={{ ...bioStyle, fontSize: '0.88rem', marginBottom: '0.75rem' }}>
                            Run <code>primes_summarize.exe</code> on any full JSON file to generate its summary:
                        </p>
                        <div style={{ background: '#001830', borderRadius: 4, padding: '0.75rem 1.25rem', marginBottom: '0.75rem' }}>
                            <code style={{ fontFamily: 'Share Tech Mono,monospace', fontSize: '0.82rem', color: '#dde6f0', display: 'block', whiteSpace: 'pre' }}>
{`primes_summarize.exe primes_20b.json primes_20b_summary.json 20000000000`}
                            </code>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                            {[
                                { label: 'primes_summarize.cpp', file: 'primes_summarize.cpp', desc: 'C++ source' },
                                { label: 'primes_summarize.exe', file: 'primes_summarize.exe', desc: 'Windows x64' },
                            ].map(({ label, file, desc }) => (
                                <a key={file} href={serverURL + '/cuda/' + file} target="_blank" rel="noopener noreferrer"
                                    style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', color: '#001830', border: '1.5px solid #001830', borderRadius: 4, padding: '0.4rem 1rem', textDecoration: 'none', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                    {label}
                                    <span style={{ fontFamily: 'Share Tech Mono,monospace', fontSize: '0.65rem', color: '#6a9ac4', fontWeight: 400, letterSpacing: '0.05em', textTransform: 'none' }}>{desc}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────
const eyebrowStyle:      React.CSSProperties = { fontFamily: 'Share Tech Mono,monospace', fontSize: '0.7rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#f59e0b', margin: '0 0 0.3rem' };
const pageTitleStyle:    React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontSize: '2.6rem', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#001830', margin: '0 0 0.5rem', lineHeight: 1 };
const ruleStyle:         React.CSSProperties = { width: 56, height: 2, background: 'linear-gradient(90deg,transparent,#f59e0b,transparent)', margin: '0 auto', border: 'none' };
const cardStyle:         React.CSSProperties = { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,24,48,0.12)', borderRadius: '2px 2px 8px 8px', marginBottom: '2rem', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,24,48,0.09)' };
const cardHeaderStyle:   React.CSSProperties = { background: '#001830', borderBottom: '2px solid #f59e0b', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' };
const cardTitleStyle:    React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#dde6f0' };
const cardYearStyle:     React.CSSProperties = { fontFamily: 'Share Tech Mono,monospace', fontSize: '0.75rem', color: '#f59e0b', letterSpacing: '0.1em' };
const cardBodyStyle:     React.CSSProperties = { padding: '1.5rem 1.75rem' };
const bioStyle:          React.CSSProperties = { fontSize: '0.95rem', lineHeight: 1.78, color: '#1a2a3a', margin: '0 0 1rem' };
const glossaryItemStyle: React.CSSProperties = { background: 'rgba(0,24,48,0.04)', borderLeft: '3px solid rgba(245,158,11,0.5)', borderRadius: '0 4px 4px 0', padding: '0.75rem 1rem' };
const glossaryTermStyle: React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#001830', marginBottom: '0.3rem' };
const glossaryDefStyle:  React.CSSProperties = { fontSize: '0.83rem', lineHeight: 1.65, color: '#334' };
const labelStyle:        React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#6a9ac4', marginBottom: '0.5rem' };
const monoSmallStyle:    React.CSSProperties = { fontFamily: 'Share Tech Mono,monospace', fontSize: '0.8rem' };
const pillBtnStyle:      React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.12em', textTransform: 'uppercase', border: '1.5px solid #001830', borderRadius: 4, padding: '0.42rem 1.1rem', transition: 'background 0.15s,color 0.15s' };
const runBtnStyle:       React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: '#001830', color: '#f59e0b', border: '1.5px solid #001830', borderRadius: 4, padding: '0.5rem 1.4rem' };
const secondaryBtnStyle: React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'transparent', color: '#001830', border: '1.5px solid #001830', borderRadius: 4, padding: '0.5rem 1.2rem', cursor: 'pointer' };
const statBubbleStyle:   React.CSSProperties = { background: 'rgba(0,24,48,0.04)', border: '1px solid rgba(0,24,48,0.1)', borderRadius: 6, padding: '0.6rem 1rem', textAlign: 'center', minWidth: 130 };
const sectionHeadStyle:  React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#001830', borderBottom: '2px solid #f59e0b', paddingBottom: '0.3rem', marginBottom: '0.75rem', fontSize: '1rem' };
const thStyle:           React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '0.68rem', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '5px 4px', textAlign: 'right', whiteSpace: 'nowrap' };
const tdStyle:           React.CSSProperties = { fontFamily: 'Share Tech Mono,monospace', fontSize: '0.72rem', padding: '2px 4px', textAlign: 'right', whiteSpace: 'nowrap' };
