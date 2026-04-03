/**
 * @fileoverview Futures trading analysis component for displaying and analyzing NQ futures trading data.
 * Provides comprehensive trading analytics including profit/loss tracking, trade history,
 * weekly summaries, and interactive charts. Supports CSV import from Think Or Swim platform.
 */

import React, { FC, useState, useEffect, ChangeEvent, useMemo } from 'react';
import PocketBase from 'pocketbase';
import { useData } from '../../contexts/DataContext';
import { Tabs, Tab, Table, Form, Row, Col, Button } from 'react-bootstrap';
import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    LogarithmicScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import './admin.css';

ChartJS.register(CategoryScale, LinearScale, LogarithmicScale, BarElement, Title, Tooltip, Legend);

/**
 * Represents a raw trade record from the database.
 * Contains basic trade information without calculated fields.
 */
interface TradeRecord {
    /** Unique identifier for the trade record */
    id: string;
    /** Date and time when the trade was executed */
    when: Date;
    /** Number of contracts traded (positive for buy, negative for sell) */
    quantity: number;
    /** Trading symbol (e.g., /NQU24) */
    symbol: string;
    /** Price per contract at execution */
    price: number;
}

interface StockTrade {
    /** Unique identifier for the stock trade record */
    id: string;
    /** Date and time when the stock trade was executed */
    when: Date;
    /** Number of shares traded (positive for buy, negative for sell) */
    quantity: number;
    /** Price per share at execution */
    price: number;
    effect: boolean;
}
interface StockRecord {
    symbol: string;
    spread: string;
    strike: string;
    type: string;
    expiration: string;
    totalQuantity: number;
    gain: number;
    multiplier: number;
    trades: StockTrade[];
}

interface StockRecords {
    [symbol: string]: StockRecord;
}

/**
 * Extended trade record with calculated profit/loss and position tracking.
 * Includes all fields from TradeRecord plus computed analytics.
 */
interface TableRow extends TradeRecord {
    /** Current position size after this trade */
    held: number;
    /** Average cost basis for current position */
    average?: number;
    /** Realized gain/loss from this trade */
    gainLoss: number;
    /** Cumulative profits up to this trade */
    profits: number;
    /** Week number within the year (1-53) */
    week: number;
    /** Year of the trade */
    year: number;
}

/**
 * Groups trades by symbol for analysis and display.
 * Key is the trading symbol, value is array of trade rows.
 */
interface Groups {
    [symbol: string]: TableRow[];
}

/**
 * Weekly summary record containing aggregated trading statistics.
 * Used for weekly performance analysis and charting.
 */
interface WeekRecord {
    /** Year of the trading week */
    year: number;
    /** Week number within the year */
    week: number;
    /** Total profits for the week */
    profits: number;
    /** Total number of contracts traded */
    trades: number;
    /** Cumulative profits up to this week */
    cumulative: number;
}

/**
 * Weekly entry type alias for cleaner type usage.
 * Same structure as WeekRecord but used in different contexts.
 */
interface WEntry {
    /** Year of the trading week */
    year: number;
    /** Week number within the year */
    week: number;
    /** Total profits for the week */
    profits: number;
    /** Total number of contracts traded */
    trades: number;
    /** Cumulative profits up to this week */
    cumulative: number;
}

/**
 * Converts a Date object to a PocketBase-compatible ID string.
 * Uses Unix timestamp truncated to 15 characters with zero padding.
 * 
 * @param dt - The date to convert to an ID
 * @returns Zero-padded 15-character string ID
 * 
 * @example
 * ```tsx
 * const id = ToId(new Date('2024-01-15T10:30:00Z'));
 * // Returns: "000001705316200" (truncated Unix timestamp)
 * ```
 */
export const ToId = (dt: Date): string => {
    const truncated = (dt.getTime() / 1000).toString().slice(0, 15).toLowerCase();
    return "0".repeat(15 - truncated.length) + truncated;
};

/**
 * Computes the ISO week number for a given date.
 * Uses January 1-7 as week 1, regardless of which day of week January 1 falls on.
 * 
 * @param date - The date to get the week number for
 * @returns Week number (1-53) within the year
 * 
 * @example
 * ```tsx
 * const week = getWeekNumber(new Date('2024-01-15'));
 * // Returns: 3 (third week of the year)
 * ```
 */
const getWeekNumber = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 1);
    const dayMs = 24 * 60 * 60 * 1000;
    const dayOfYear = Math.floor((date.getTime() - start.getTime()) / dayMs) + 1;
    return Math.ceil(dayOfYear / 7);
};

/**
 * Formats a dollar amount with proper styling for positive/negative values.
 * Negative values are displayed in red parentheses, positive values in black.
 * 
 * @param value - The dollar amount to format (optional)
 * @returns JSX element with styled dollar amount or dash for undefined
 * 
 * @example
 * ```tsx
 * formatDollar(1234.56);  // Returns: "$1,235"
 * formatDollar(-1234.56); // Returns: <span className="text-danger">($1,235)</span>
 * formatDollar(undefined); // Returns: "-"
 * ```
 */
const formatDollar = (value?: number, rounded?: boolean): JSX.Element | string => {
    if (!value) return '-';
    const roundedValue = rounded ? Math.round(value) : Math.round(100 * value) / 100;
    const abs = Math.abs(roundedValue);
    const str = abs.toLocaleString();
    return roundedValue < 0
        ? <span className="text-danger">({`$${str}`})</span>
        : `$${str}`;
};

/**
 * Processes raw trade records to compute running positions, P&L, and weekly summaries.
 * Calculates average cost basis, realized gains/losses, and cumulative profits.
 * Groups trades by symbol and aggregates weekly statistics.
 * 
 * @param raw - Array of raw trade records from the database
 * @returns Object containing grouped trades and weekly summaries
 * 
 * @example
 * ```tsx
 * const trades = [
 *   { id: '1', when: new Date(), quantity: 2, symbol: '/NQU24', price: 18000 },
 *   { id: '2', when: new Date(), quantity: -1, symbol: '/NQU24', price: 18100 }
 * ];
 * const { groups, byWeek } = computeTableGroups(trades);
 * // Returns calculated positions, P&L, and weekly aggregations
 * ```
 */
const computeTableGroups = (raw: TradeRecord[]) => {

    const groups: Groups = {};
    // map year -> array of WEntry
    const byWeekMap: Record<number, WEntry[]> = {};

    raw.forEach(r => {
        if (!groups[r.symbol]) groups[r.symbol] = [];
        groups[r.symbol].push({ ...r, held: 0, average: 0, gainLoss: 0, profits: 0, week: 0, year: r.when.getFullYear() });
    });

    Object.keys(groups).forEach(sym => {
        const list = groups[sym];
        // sort by numeric id
        list.sort((a: TradeRecord, b: TradeRecord) => parseInt(a.id) - parseInt(b.id));

        let prevHeld = 0;
        let prevAvg: number | undefined = undefined;
        let cum = 0;

        list.forEach((r: TableRow) => {
            const held = prevHeld + r.quantity;
            let avg: number | undefined = undefined;

            if (prevAvg === undefined && Math.abs(held) !== 0) {
                // initial basis
                avg = r.price;
            } else if (held !== 0) {
                // normal update to average when increasing position
                // preserve average when reducing position unless crossing sign
                if (Math.abs(prevHeld) > Math.abs(held) && prevAvg !== undefined) {
                    avg = prevAvg;
                } else {
                    avg = ((prevAvg ?? 0) * prevHeld + r.quantity * r.price) / (held);
                }
            }

            let gl = 0;
            if (prevHeld !== 0 && Math.abs(prevHeld) > Math.abs(held) && prevAvg !== undefined) {
                const closed = prevHeld - held;
                gl = (r.price - prevAvg) * closed * 20; // multiplier for contract size
            }

            cum += gl;
            const year = r.when.getFullYear();
            const week = getWeekNumber(r.when);

            r.held = held;
            r.average = avg;
            r.gainLoss = gl;
            r.profits = cum;
            r.week = week;
            r.year = year;

            prevHeld = held;
            prevAvg = avg;
        });

        // aggregate by week for this symbol's rows
        list.forEach(r => {
            const keyYear = r.year;
            if (!byWeekMap[keyYear]) byWeekMap[keyYear] = [];
            const bucket = byWeekMap[keyYear];
            let entry = bucket.find(e => e.week === r.week);
            if (!entry) {
                entry = { year: r.year, week: r.week, profits: 0, trades: 0, cumulative: 0 };
                bucket.push(entry);
            }
            entry.profits += r.gainLoss;
            entry.trades += Math.abs(r.quantity);
        });
    });

    // convert map to sorted array-of-arrays by year
    const byWeek: WEntry[][] = Object.keys(byWeekMap)
        .map(k => ({ year: +k, entries: byWeekMap[+k] }))
        .sort((a, b) => a.year - b.year)
        .map(obj => obj.entries.sort((x, y) => x.week - y.week));

    // compute cumulative per year
    byWeek.forEach(bucket => {
        let cum = 0;
        bucket.forEach(e => {
            cum += e.profits;
            e.cumulative = cum;
        });
    });

    return { groups, byWeek };
};

/**
 * Creates Chart.js options with quarterly guide lines drawn on the chart.
 * If labels length is small it will draw 3 guide lines (split into 4 groups).
 *
 * @param labels - array of chart labels (chronological)
 * @param title - optional chart title
 * @returns ChartOptions for use with Chart.js charts
 */
export const makeQuarterGuidesOptions = (labels: string[], title?: string): ChartOptions => {
    const quarterPlugin = {
        id: 'quarterGuides',
        afterDraw: (chart: any) => {
            const ctx = chart.ctx;
            const xScale: any = chart.scales?.['x'] ?? chart.scales?.['x-axis-0'];
            if (!ctx || !xScale || !labels || labels.length < 2) return;

            const n = labels.length;
            const indices = [
                Math.floor(n / 4),
                Math.floor(n / 2),
                Math.floor((3 * n) / 4)
            ].filter((idx, i, arr) => idx > 0 && idx < n && arr.indexOf(idx) === i);

            ctx.save();
            ctx.strokeStyle = 'rgba(0,0,0,0.12)';
            ctx.lineWidth = 1;
            indices.forEach(idx => {
                let x: number | null = null;
                try {
                    if (typeof xScale.getPixelForTick === 'function') x = xScale.getPixelForTick(idx);
                    else if (typeof xScale.getPixelForValue === 'function') x = xScale.getPixelForValue(idx);
                } catch (e) {
                    x = null;
                }
                if (x != null && isFinite(x)) {
                    ctx.beginPath();
                    ctx.moveTo(x, chart.chartArea.top);
                    ctx.lineTo(x, chart.chartArea.bottom);
                    ctx.stroke();
                }
            });
            ctx.restore();
        }
    };

    const pluginsConfig = {
        title: {
            display: !!title,
            text: title ?? '',
            padding: { top: 8, bottom: 8 },
        },
        legend: { display: false },
    };

    const options: ChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: pluginsConfig,
        scales: {
            x: {
                ticks: {
                    autoSkip: true,
                    maxRotation: 0,
                    minRotation: 0,
                }
            },
            y: {
                beginAtZero: true,
            }
        }
    };

    // attach plugin object(s) for the chart instance (consumer casts to any when needed)
    (options as any).pluginsArray = [quarterPlugin];
    (options as any).pluginObjects = [quarterPlugin];

    return options;
};

const UploadPanel: FC<{ maxDate: Date; pb: PocketBase; onReload: () => void }> = ({ maxDate, pb, onReload }) => {
    const [proc, setProc] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [added, setAdded] = useState(0);
    const [rejected, setRejected] = useState(0);
    const [other, setOther] = useState<any>(null);


    const upload = async (e: ChangeEvent<HTMLInputElement>) => {
        setProc(true);
        setErr(null);
        setTotal(0);
        setAdded(0);
        setRejected(0);
        setOther(null);

        const file = e.target.files?.[0];
        if (!file) {
            setErr("No file selected");
            setProc(false);
            return;
        }

        try {
            const text = await file.text();

            // simple CSV split that respects quoted commas
            let lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length === 0) {
                setErr("Empty file");
                return;
            }
            while (lines.length > 0 && !lines[0].startsWith('Account Trade History')) lines.shift();
            lines.shift();
            let i = 0;
            while (i < lines.length && lines[i].startsWith(',')) i++;
            lines = lines.slice(0, i);
            //remove leading ','
            lines = lines.map(l => l.replace(/^,/, ''));
            debugger;
            // header mapping
            const splitCsv = (line: string) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
            const headers = splitCsv(lines[0]).map(h => h.toLowerCase());
            const rows = lines.slice(1).map(l => {
                const cols = splitCsv(l);
                const obj: Record<string, string> = {};
                cols.forEach((c, i) => { obj[headers[i] ?? `c${i}`] = c ?? ''; });
                return obj;
            });

            let t = 0, a = 0, r = 0;
            const otherRows: any[] = [];

            for (const row of rows) {
                t++;
                try {
                    // try to detect datetime fields
                    const dtField = row['exec time'];
                    let dt: Date;
                    dt = new Date(dtField);

                    debugger;
                    if (isNaN(dt.getTime())) {
                        r++;
                        continue;
                    }

                    // common fields
                    const symbol = (row['symbol'] || row['sym'] || '').trim();
                    const qtyRaw = row['quantity'] || row['qty'] || row['shares'] || '0';
                    const priceRaw = row['price'] || row['fill price'] || row['fillprice'] || '0';
                    const spread = row['spread'] || row['spread name'] || '';
                    const expiration = row['expiration'] || row['exp'] || row['expiry'] || '';
                    const strike = row['strike'] || row['strike price'] || '';
                    const type = row['type'] || '';
                    const effectRaw = (row['effect'] || row['side'] || '').toLowerCase();
                    const quantity = Number(qtyRaw) || 0;
                    const price = Number(priceRaw) || 0;
                    const effect = effectRaw === 'open' || effectRaw === 'to open' || effectRaw === 'buy' || effectRaw === 'long';

                    // ignore obviously invalid rows
                    if (!symbol || quantity === 0) {
                        r++;
                        continue;
                    }

                    // FUTURES detection: symbol like /NQ...
                    const isFuture = symbol.startsWith('/NQ') || symbol.includes('NQ');
                    if (isFuture) {
                        // prevent duplicates by id
                        const when = dt.toISOString();
                        const id = ToId(dt);
                        const exists = await pb.collection('trades').getList(1, 1, { filter: `id = ${JSON.stringify(id)}` });
                        if (exists.totalItems > 0) {
                            r++;
                        } else {
                            await pb.collection('trades').create({
                                id,
                                when,
                                quantity,
                                symbol,
                                price
                            });
                            a++;
                        }
                    } else {
                        // non-future -> stocks collection (upsert by id)
                        const when = dt.toISOString();
                        const id = ToId(dt);
                        const res = await pb.collection('stocks').getList(1, 1, { filter: `id = ${JSON.stringify(id)}` });
                        if (res.totalItems > 0) {
                            await pb.collection('stocks').update(id, {
                                when,
                                quantity,
                                symbol,
                                price,
                                spread,
                                effect,
                                expiration,
                                strike,
                                type,
                            });
                            a++;
                        } else {
                            await pb.collection('stocks').create({
                                id,
                                when,
                                quantity,
                                symbol,
                                price,
                                spread,
                                effect,
                                expiration,
                                strike,
                                type,
                            });
                            a++;
                        }
                    }

                    otherRows.push({ dt: dt.toISOString(), symbol, quantity, price, spread, expiration, strike, type, effect });
                } catch (innerErr) {
                    console.error("row error", innerErr);
                    r++;
                }
            }

            setOther(otherRows);
            setTotal(t);
            setAdded(a);
            setRejected(r);
            onReload();
        } catch (err: any) {
            setErr(err?.message ?? String(err));
        } finally {
            setProc(false);
            // clear file input value if needed
            try { (e.target as HTMLInputElement).value = ''; } catch { }
        }
    };

    return (
        <div>
            <h3>Upload Trades CSV</h3>
            <h6>Save statement CSV from Think Or Swim and upload the file here</h6>

            {total > 0 && <p>Total scanned: {total}, Added: {added}, Rejected: {rejected}</p>}
            <div style={{ width: '60%', marginLeft: '20%' }}>
                <Form.Control
                    type="file"
                    accept=".csv"
                    onChange={upload}
                    disabled={proc}
                    className="mb-2"
                />
            </div>
            {err && <p className="text-danger">{err}</p>}
        </div>
    );
};

/**
 * Table panel component for displaying trades grouped by symbol.
 * Shows detailed trade history with sorting and filtering capabilities.
 * Displays position tracking, average cost basis, and realized P&L.
 * 
 * @component
 * @param props - Component props
 * @param props.groups - Trades grouped by trading symbol
 * 
 * @example
 * ```tsx
 * const groups = { "/NQU24": [trade1, trade2], "/NQZ24": [trade3] };
 * <TablePanel groups={groups} />
 * ```
 */
const TablePanel: FC<{ groups: Groups }> = ({ groups }) => {
    /** Available trading symbols sorted by year and expiration */
    const [symbols, setSymbols] = useState<string[]>([]);
    /** Currently selected symbol for display */
    const [sel, setSel] = useState('');
    /** Filtered and sorted trade rows for display */
    const [rows, setRows] = useState<TableRow[]>([]);
    /** Sort direction for execution time column */
    const [sortAsc, setSortAsc] = useState(true);

    /**
     * Effect to populate and sort available symbols.
     * Sorts by year (descending) then by expiration letter.
     */
    useEffect(() => {
        const all = Object.keys(groups);

        /**
         * Parses a futures symbol to extract year and expiration letter.
         * 
         * @param s - Symbol string (e.g., "/NQU24")
         * @returns Object with parsed letter and year
         */
        const parseSymbol = (s: string) => {
            const m = /^\/?NQ([A-Z])(\d{2})$/.exec(s) || [];
            return { letter: m[1] ?? '', year: m[2] ? parseInt(m[2], 10) : -1 };
        };

        all.sort((a, b) => {
            const pa = parseSymbol(a), pb = parseSymbol(b);
            if (pb.year !== pa.year) return pb.year - pa.year;
            return pb.letter.localeCompare(pa.letter);
        });

        setSymbols(all);
        if (all.length && !sel) setSel(all[0]);
    }, [groups]);

    /**
     * Effect to filter and sort trades for the selected symbol.
     */
    useEffect(() => {
        let newRows = sel ? (groups[sel] ?? []) : [];
        // sort whenever sel or sortAsc changes
        newRows = [...newRows].sort((a, b) =>
            sortAsc
                ? a.when.getTime() - b.when.getTime()
                : b.when.getTime() - a.when.getTime()
        );
        setRows(newRows);
    }, [sel, groups, sortAsc]);

    /**
     * Toggles the sort direction for the execution time column.
     */
    const toggleSort = () => {
        setSortAsc(prev => !prev);
    };

    return (
        <div>
            <Form.Label>Symbol:</Form.Label>
            <Form.Select value={sel} onChange={e => setSel(e.target.value)} className="w-auto d-inline-block mb-2">
                <option value="">--Select--</option>
                {symbols.map(s => <option key={s} value={s}>{s}</option>)}
            </Form.Select>

            {rows.length > 0 && (
                <Table size="sm">
                    <thead className="table-secondary">
                        <tr>
                            <th onClick={toggleSort} style={{ cursor: 'pointer' }}>
                                Exec Time {sortAsc ? '▲' : '▼'}
                            </th>
                            {['Qty', 'Symbol', 'Price', 'Held', 'Average', 'Gain/Loss', 'Profits', 'WW'].map(h => (
                                <th key={h}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={`${r.id}-${i}`} className={i % 2 ? '' : 'table-light'}>
                                <td>{r.when.toLocaleString()}</td>
                                <td>{r.quantity}</td>
                                <td>{r.symbol}</td>
                                <td>{`$${r.price.toFixed(2)}`}</td>
                                <td>{r.held}</td>
                                <td>{formatDollar(r.average)}</td>
                                <td>{formatDollar(r.gainLoss)}</td>
                                <td>{formatDollar(r.profits)}</td>
                                <td>{r.week}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
        </div>
    );
};

/**
 * Summary panel component showing annual performance by symbol.
 * Displays aggregated gains, losses, and trading activity for each year and symbol.
 * Includes commission calculations and net profit summaries.
 * 
 * @component
 * @param props - Component props
 * @param props.groups - Trades grouped by trading symbol
 * 
 * @example
 * ```tsx
 * const groups = { "/NQU24": [trade1, trade2] };
 * <SummaryPanel groups={groups} />
 * ```
 */
const SummaryPanel: FC<{ groups: Groups }> = ({ groups }) => {
    /** Flattened and computed trade rows for analysis */
    const rows = useMemo(
        () => Object.values(groups).flat(),
        [groups]
    );

    /** Aggregated data by year and symbol */
    const byYear = rows.reduce((acc, r) => {
        const y = r.when.getFullYear(); const key = `${y}|${r.symbol}`;
        if (!acc[key]) acc[key] = { year: y, symbol: r.symbol, gains: 0, losses: 0, trades: 0 };
        if (r.gainLoss > 0) acc[key].gains += r.gainLoss;
        if (r.gainLoss < 0) acc[key].losses += r.gainLoss;
        acc[key].trades += Math.abs(r.quantity);
        return acc;
    }, {} as Record<string, { year: number; symbol: string; gains: number; losses: number; trades: number; }>);

    /** Available years sorted in descending order */
    const years = Array.from(new Set(rows.map(r => r.when.getFullYear()))).sort().reverse();

    return (
        <div>
            {years.map(y => {
                const entries = Object.values(byYear).filter(e => e.year === y);
                const tg = entries.reduce((s, e) => s + e.gains, 0);
                const tl = entries.reduce((s, e) => s + e.losses, 0);
                const tt = entries.reduce((s, e) => s + e.trades, 0);
                const comm = -3.25 * tt;

                return (
                    <div key={y} className="mb-4">
                        <h5>{y}</h5>
                        <Table size="sm">
                            <thead className="table-secondary">
                                <tr><th>Year</th><th>Symbol</th><th>Gains</th><th>Losses</th><th>Net</th><th>Trades</th></tr>
                            </thead>
                            <tbody>
                                {entries.map(e => {
                                    const net = e.gains + e.losses;
                                    return (
                                        <tr key={`${e.year}-${e.symbol}`}>
                                            <td>{e.year}</td><td>{e.symbol}</td>
                                            <td>{formatDollar(e.gains)}</td><td>{formatDollar(-e.losses)}</td>
                                            <td>{formatDollar(net)}</td><td>{e.trades}</td>
                                        </tr>
                                    );
                                })}
                                <tr className="fw-bold">
                                    <td></td><td>Total</td>
                                    <td>{formatDollar(tg)}</td><td>{formatDollar(-tl)}</td>
                                    <td>{formatDollar(tg + tl)}</td><td>{tt}</td>
                                </tr>
                                <tr>
                                    <td colSpan={4}></td><td>Commissions:</td><td>{formatDollar(comm)}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>
                );
            })}
        </div>
    );
};

/**
 * Weekly performance table component showing chronological trading statistics.
 * Displays weekly profits, cumulative profits, and trading volume in tabular format.
 * 
 * @component
 * @param props - Component props
 * @param props.byWeeks - Weekly trading data organized by year and week
 * 
 * @example
 * ```tsx
 * const byWeeks = [[weekData1, weekData2], [weekData3]]; // [2023][2024]
 * <WeeksPanel byWeeks={byWeeks} />
 * ```
 */
const WeeksPanel: FC<{ byWeeks: WEntry[][] }> = ({ byWeeks }) => {
    /** Flattened and sorted weekly data for display */
    const display = useMemo(() => {
        const flat = byWeeks.flat().filter(Boolean) as WEntry[];
        return flat.sort((a, b) => a.year - b.year || a.week - b.week);
    }, [byWeeks]);

    return (
        <Table size="sm">
            <thead className="table-secondary">
                <tr><th>Year</th><th>WW</th><th>Week profits</th><th>Cumulative profits</th><th>Trades</th></tr>
            </thead>
            <tbody>
                {display.map((e, i) => (
                    <tr key={`${e.year}-${e.week}`} className={i % 2 ? '' : 'table-light'}>
                        <td>{e.year}</td>
                        <td>{e.week}</td>
                        <td>{formatDollar(e.profits)}</td>
                        <td>{formatDollar(e.cumulative)}</td>
                        <td>{e.trades}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );
};

/**
 * Weekly profit chart component displaying bar chart of weekly trading profits.
 * Shows profit/loss by week with color coding by year and quarterly guide lines.
 * 
 * @component
 * @param props - Component props
 * @param props.byWeeks - Weekly trading data organized by year and week
 * 
 * @example
 * ```tsx
 * const byWeeks = [[weekData1, weekData2]];
 * <WeeksProfitChart byWeeks={byWeeks} />
 * ```
 */
const WeeksProfitChart: FC<{ byWeeks: WEntry[][] }> = ({ byWeeks }) => {
    /** Chart labels (formatted dates) */
    const [labels, setLabels] = useState<string[]>([]);
    /** Chart data values (weekly profits) */
    const [values, setValues] = useState<number[]>([]);
    /** Bar colors (coded by year) */
    const [colors, setColors] = useState<string[]>([]);

    /**
     * Effect to process weekly data for chart display.
     * Sorts data chronologically and assigns colors by year.
     */
    useEffect(() => {
        const flat = byWeeks.flat().filter(Boolean) as WEntry[];
        const sorted = flat.sort((a, b) => a.year - b.year || a.week - b.week);

        const palette = ['rgba(75,192,192,0.6)', 'rgba(255,159,64,0.6)', 'rgba(153,102,255,0.6)', 'rgba(54,162,235,0.6)'];
        const years = Array.from(new Set(sorted.map(e => e.year)));
        const yearToColor: Record<number, string> = {};
        years.forEach((yr, i) => { yearToColor[yr] = palette[i % palette.length]; });

        setLabels(sorted.map(e => {
            const firstDay = new Date(e.year, 0, 1 + (e.week - 1) * 7);
            return firstDay.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
        }));
        setValues(sorted.map(e => e.profits));
        setColors(sorted.map(e => yearToColor[e.year]));
    }, [byWeeks]);

    /** Chart.js data configuration */
    const chartData: ChartData<'bar'> = {
        labels,
        datasets: [{ label: 'Week Profit', data: values, backgroundColor: colors }],
    };

    /** Chart.js options with quarterly guides */
    const options = makeQuarterGuidesOptions(labels, 'Weekly Profits');
    return <Bar options={options as any} data={chartData} />;
};

/**
 * Cumulative profit chart component showing running total of trading profits.
 * Displays cumulative P&L over time with color coding by year and quarterly guides.
 * 
 * @component
 * @param props - Component props
 * @param props.byWeeks - Weekly trading data organized by year and week
 * 
 * @example
 * ```tsx
 * const byWeeks = [[weekData1, weekData2]];
 * <CumulativeProfitChart byWeeks={byWeeks} />
 * ```
 */
const CumulativeProfitChart: FC<{ byWeeks: WEntry[][] }> = ({ byWeeks }) => {
    /** Chart labels (formatted dates) */
    const [labels, setLabels] = useState<string[]>([]);
    /** Chart data values (cumulative profits) */
    const [values, setValues] = useState<number[]>([]);
    /** Bar colors (coded by year) */
    const [colors, setColors] = useState<string[]>([]);

    /**
     * Effect to process weekly data for cumulative chart display.
     */
    useEffect(() => {
        const flat = byWeeks.flat().filter(Boolean) as WEntry[];
        const sorted = flat.sort((a, b) => a.year - b.year || a.week - b.week);

        const palette = ['rgba(153,102,255,0.6)', 'rgba(255,205,86,0.6)', 'rgba(201,203,207,0.6)', 'rgba(54,162,235,0.6)'];
        const years = Array.from(new Set(sorted.map(e => e.year)));
        const yearToColor: Record<number, string> = {};
        years.forEach((yr, i) => { yearToColor[yr] = palette[i % palette.length]; });

        let cum = 0;
        setLabels(sorted.map(e => {
            const firstDay = new Date(e.year, 0, 1 + (e.week - 1) * 7);
            return firstDay.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
        }));
        setValues(sorted.map(e => (cum += e.profits)));
        setColors(sorted.map(e => yearToColor[e.year]));
    }, [byWeeks]);

    /** Chart.js data configuration */
    const chartData: ChartData<'bar'> = {
        labels,
        datasets: [{ label: 'Cumulative Profit', data: values, backgroundColor: colors }],
    };

    /** Chart.js options with quarterly guides */
    const options = makeQuarterGuidesOptions(labels, 'Cumulative Profits');
    return <Bar options={options as any} data={chartData} />;
};

/**
 * Weekly trading volume chart component showing contract quantities traded.
 * Displays trading activity by week with logarithmic scale and quarterly guides.
 * 
 * @component
 * @param props - Component props
 * @param props.byWeeks - Weekly trading data organized by year and week
 * 
 * @example
 * ```tsx
 * const byWeeks = [[weekData1, weekData2]];
 * <WeeksTradeChart byWeeks={byWeeks} />
 * ```
 */
const WeeksTradeChart: FC<{ byWeeks: WEntry[][] }> = ({ byWeeks }) => {
    /** Chart labels (formatted dates) */
    const [labels, setLabels] = useState<string[]>([]);
    /** Chart data values (trade quantities) */
    const [values, setValues] = useState<number[]>([]);
    /** Bar colors (coded by year) */
    const [colors, setColors] = useState<string[]>([]);

    /**
     * Effect to process weekly data for trade volume chart.
     */
    useEffect(() => {
        const flat = byWeeks.flat().filter(Boolean) as WEntry[];
        const sorted = flat.sort((a, b) => a.year - b.year || a.week - b.week);

        const palette = ['rgba(153,102,255,0.6)', 'rgba(255,205,86,0.6)', 'rgba(201,203,207,0.6)', 'rgba(54,162,235,0.6)'];
        const years = Array.from(new Set(sorted.map(e => e.year)));
        const yearToColor: Record<number, string> = {};
        years.forEach((yr, i) => { yearToColor[yr] = palette[i % palette.length]; });

        setLabels(sorted.map(e => {
            const firstDay = new Date(e.year, 0, 1 + (e.week - 1) * 7);
            return firstDay.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
        }));
        setValues(sorted.map(e => e.trades));
        setColors(sorted.map(e => yearToColor[e.year]));
    }, [byWeeks]);

    /** Chart.js data configuration */
    const chartData: ChartData<'bar'> = {
        labels,
        datasets: [{ label: 'Weekly Trade Quantity', data: values, backgroundColor: colors }],
    };

    /** Chart.js options with quarterly guides and logarithmic scale */
    const options = makeQuarterGuidesOptions(labels, 'Weekly Trade Quantity');
    options.scales!.y!.type = 'logarithmic'; // use logarithmic scale for better visibility
    return <Bar options={options as any} data={chartData} />;
};

interface StockTrades {
    symbol: string;
    moves: Move[];
}

interface Move {
    when: Date;
    price: number;
    quantity: number;
    spread: string;
    effect: boolean;
    held: number;
    value: number;
    avgPrice: number;
    uncleared: number;
}

interface Cleared {
    in: Move[];
    out: Move[];
    ballance: number;
    costIn?: number;
    costOut?: number;
    sym?: string;
    dateIn?: Date;
    dateOut?: Date;
}


const StocksPanel: FC<{ stocks: StockRecords }> = ({ stocks }) => {


    return (
        <div>
            <h3>Non-FUTURE Trades Uploaded</h3>

            {Object.keys(stocks).map((symbol, i) => {
                return (
                    <div key={i}>
                        <h4>{symbol}</h4>
                        <Table size="sm">
                            <thead className="table-secondary">
                                <tr>
                                    <th>Exec Time</th>
                                    <th>Price</th>
                                    <th>Qty</th>
                                    <th>Effect</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stocks[symbol].trades.map((move, j) => (
                                    <tr key={`${i}-${j}`}>
                                        <td>{move.when.toLocaleString()}</td>
                                        <td>{formatDollar(move.price, false)}</td>
                                        <td>{move.quantity}</td>
                                        <td>{move.effect ? 'TO OPEN' : 'TO CLOSE'}</td>
                                    </tr>
                                ))}
                            </tbody>
                            {/* add summary row */}
                            <tfoot>
                                <tr>
                                    <td colSpan={2}>Total</td>
                                    <td>{stocks[symbol].totalQuantity}</td>
                                    <td>{stocks[symbol].totalQuantity == 0 ? formatDollar(stocks[symbol].gain) : "--"}</td>
                                </tr>
                            </tfoot>
                        </Table>
                    </div>
                )
            })}
        </div>
    );
};
/**
 * Main Futures trading analysis component.
 * Provides comprehensive futures trading analytics with multiple views and data import.
 * Includes tabbed interface for different analysis perspectives and CSV upload functionality.
 *
 * @component
 * @returns JSX element containing the complete futures trading interface
 *
 * @example
 * ```tsx
 * // Used in routing for administrator access
 * <Route path="/admin/futures" component={Futures} />
        *
        * // Direct usage (requires authentication context)
        * <Futures />
        * ```
        *
        * @description
        * The Futures component provides:
        * - CSV import from Think Or Swim platform
        * - Trade history table with position tracking
        * - Annual summary with P&L breakdown
        * - Weekly performance analysis
        * - Interactive profit/loss charts
        * - Cumulative performance tracking
        * - Trading volume analysis
        * - Theme switching (light/dark mode)
        *
        * @remarks
        * - Requires PocketBase authentication and trades collection
        * - Processes only NQ futures contracts (/NQxYY format)
        * - Calculates position-based P&L with average cost tracking
        * - Supports commission calculations at $3.25 per contract
        * - Uses Chart.js for interactive visualizations
        * - Implements quarterly guide lines on charts for easy time reference
        */
const Futures: FC = (): JSX.Element => {
    /** PocketBase instance from context for database operations */
    const { pb } = useData() as { pb: PocketBase };
    /** Loaded stock records from the database */
    const [stocks, setStocks] = useState<StockRecords>({});
    /** Trades grouped by symbol for analysis */
    const [groups, setGroups] = useState<Groups>({});
    /** Weekly trading data organized by year */
    const [byWeeks, setByWeeks] = useState<WEntry[][]>([]);
    /** Latest existing trade date for duplicate prevention */
    const [maxDate, setMaxDate] = useState<Date>(new Date(0));
    /** Active tab key for the tabbed interface */
    const [key, setKey] = useState<'table' | 'summary' | 'weeks' | 'chart1' | 'chart2'>('table');
    /** Reload trigger for refreshing data after uploads */
    const [reloadFlag, setReloadFlag] = useState(0);
    /** Theme selection for UI appearance */
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    /**
     * Effect to load and process trading data from the database.
     * Fetches all trades, computes P&L, and organizes data for display.
     */
    useEffect(() => {
        pb.collection('trades').getFullList<any>({ sort: 'when' }).then(all => {
            const recs: TradeRecord[] = all.map(r => ({ id: r.id, when: new Date(r.when), quantity: +r.quantity, symbol: r.symbol, price: +r.price }));


            // determine the most recent existing trade date
            const maxDate = recs.length > 0
                ? new Date(Math.max(...recs.map(d => d.when.getTime())))
                : new Date(0);

            const { groups, byWeek } = computeTableGroups(recs);
            setMaxDate(maxDate);
            setGroups(groups);
            setByWeeks(byWeek);

        });
        // get date of jan 1 of this year
        const dt = new Date();
        dt.setMonth(0);
        dt.setDate(1);
        dt.setHours(0, 0, 0, 0);
        const id = ToId(dt);

        // object of StockRecord indexed by symbol
        const stockRecords: StockRecords = {};

        // get stocks from id onwards that have effect == false (i.e., TO CLOSE)
        // pb.collection('stocks').getList<any>(1, 200, { filter: `id >= "${id}" && effect = false` }).then(res => {
        pb.collection('stocks').getFullList<any>({ filter: `id >= "${id}" && effect = false` }).then(async (res) => {

            // iterate through results and build stockRecords object
            // for each record, check if symbol exists in stockRecords
            // if not, add it
            // add record to stockRecords[symbol].trades
            res.forEach(r => {
                let symbol = r.symbol;
                let multiplier = 1;
                if (r.symbol.includes("/CL")) multiplier = 1000;
                if (r.symbol.includes("/GC")) multiplier = 100;
                if (r.symbol.includes("/SI")) multiplier = 5000;
                if (r.spread.includes("SINGLE")) {
                    multiplier = 100;
                    symbol += ` ${r.type} $${r.strike} Exp: ${r.expiration}`;
                }
                if (!stockRecords[symbol]) {
                    stockRecords[symbol] = {
                        symbol: r.symbol,
                        spread: r.spread,
                        expiration: r.expiration,
                        strike: r.strike,
                        type: r.type,
                        totalQuantity: 0,
                        gain: 0,
                        multiplier,
                        trades: []
                    };
                }
                stockRecords[symbol].totalQuantity += +r.quantity;
                stockRecords[symbol].gain -= r.quantity * r.price * multiplier;
                stockRecords[symbol].trades.push({
                    id: r.id,
                    when: new Date(r.when),
                    quantity: +r.quantity,
                    price: +r.price * multiplier,
                    effect: r.effect,
                });
            });


            // after you build stockRecords from the first query:
            const stockValues = Object.values(stockRecords);

            // perform per-symbol queries sequentially to avoid PocketBase auto-cancellation
            for (const sr of stockValues) {
                try {
                    if (!sr.trades || sr.trades.length === 0) {
                        console.log(`Skipping ${sr.symbol} - no trades`);
                        continue;
                    }
                    const short = sr.totalQuantity < 0;
                    sr.trades.sort((a, b) => a.when.getTime() - b.when.getTime());
                    const lastId = sr.trades[sr.trades.length - 1].id;

                    const more = await pb.collection('stocks').getFullList<any>({
                        filter: `id < ${JSON.stringify(lastId)} && effect = true && symbol = ${JSON.stringify(sr.symbol)} && spread = ${JSON.stringify(sr.spread)} && strike = ${JSON.stringify(sr.strike)} && expiration = ${JSON.stringify(sr.expiration)}`,
                        sort: '-when' // newest first
                    });

                    console.log(`Loaded ${more.length} more for ${sr.symbol} (${sr.spread}) out of ${stockValues.length}`);
                    more.forEach(r => {
                        if ((short && sr.totalQuantity >= 0) || (!short && sr.totalQuantity <= 0)) {
                            // skip opposite effect trades
                            return;
                        }
                        sr.trades.push({
                            id: r.id,
                            when: new Date(r.when),
                            quantity: +r.quantity,
                            price: +r.price * sr.multiplier,
                            effect: r.effect,
                        });
                        sr.totalQuantity += +r.quantity;
                        sr.gain -= r.quantity * r.price * sr.multiplier;

                    });
                    //sort trades again
                    sr.trades.sort((a, b) => a.when.getTime() - b.when.getTime());
                    // small delay to reduce server pressure / likelihood of auto-cancel
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (err) {
                    console.error("Error fetching more stocks for", sr.symbol, err);
                    // continue to next symbol
                }
            }
            setStocks(stockRecords);
        });
    }, [pb, reloadFlag]);

    /** Triggers data reload after successful CSV upload */
    const reload = () => setReloadFlag(f => f + 1);

    return (
        <div style={{ height: '100vh' }}>
            <div style={{ textAlign: "center" }} data-bs-theme={theme} >

                <Row style={{ paddingBottom: '20px', borderBottom: '2px solid #ccc', paddingTop: '20px' }} className="align-items-center">
                    <Col xs={4} sm={{ offset: 1, span: 6 }} md={{ offset: 0, span: 6 }} >
                        <h2>Futures up to {maxDate.toLocaleDateString()}</h2>
                    </Col>
                    <Col xs={4} md={{ offset: 1, span: 4 }} style={{ border: '2px solid #ccc', padding: '10px', borderRadius: '5px' }}>
                        <UploadPanel maxDate={maxDate} pb={pb} onReload={reload} />
                    </Col>
                </Row>
                <Row style={{ paddingBottom: '10px', textAlign: 'left' }} >
                    <a className='bs-blue' onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                        Toggle Theme
                    </a>
                </Row>
                <Row className="mb-3">
                    <Tabs activeKey={key} onSelect={k => setKey(k as any)} transition={false}>
                        <Tab eventKey="table" title="Table">
                            <div className="p-3 bg-light"><TablePanel groups={groups} /></div>
                        </Tab>
                        <Tab eventKey="summary" title="Summary">
                            <div className="p-3 bg-light"><SummaryPanel groups={groups} /></div>
                        </Tab>
                        <Tab eventKey="weeks" title="Weeks">
                            <div className="p-3 bg-light"><WeeksPanel byWeeks={byWeeks} /></div>
                        </Tab>
                        <Tab eventKey="chart1" title="Week Profit Chart">
                            <div className="p-3 bg-light"><WeeksProfitChart byWeeks={byWeeks} /></div>
                        </Tab>
                        <Tab eventKey="chart2" title="Cumulative Chart">
                            <div className="p-3 bg-light"><CumulativeProfitChart byWeeks={byWeeks} /></div>
                        </Tab>
                        <Tab eventKey="chart3" title="Quantity Chart">
                            <div className="p-3 bg-light"><WeeksTradeChart byWeeks={byWeeks} /></div>
                        </Tab>
                        <Tab eventKey="stocks" title="Stocks">
                            <div className="p-3 bg-light"><StocksPanel stocks={stocks} /></div>
                        </Tab>
                    </Tabs>
                </Row>
            </div >
        </div >
    );
};

export default Futures;
