/**
 * @fileoverview Futures trading analysis component for displaying and analyzing futures trading data.
 * Supports any CME futures contract (NQ, ES, SI, PL, CL, GC, …) with per-contract multipliers.
 * Provides P&L tracking, trade history, weekly summaries, and interactive charts.
 * Supports CSV import from Think Or Swim platform.
 */

import React, { FC, useState, useEffect, ChangeEvent, useMemo, useRef, useCallback } from 'react';
import PocketBase from 'pocketbase';
import { useData } from '../../contexts/DataContext';
import { Form } from 'react-bootstrap';
import { Bar, Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    LogarithmicScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import './admin.css';
import AdminPageLayout from './AdminPageLayout';

ChartJS.register(CategoryScale, LinearScale, LogarithmicScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

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
    /** True for synthetic year-end mark-to-market rows */
    isYearEnd?: boolean;
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
    const decimals = rounded ? 0 : 2;
    const str = abs.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
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
/**
 * Returns symbols that were held across at least one year-end boundary,
 * as `{sym, symKey, year}` where `year` is the year being crossed (e.g. 2024
 * means the position was open at Dec 31 2024).
 */
const findYearCrossings = (raw: TradeRecord[]): Array<{ sym: string; symKey: string; year: number }> => {
    const bySym: Record<string, TradeRecord[]> = {};
    raw.forEach(r => { (bySym[r.symbol] ??= []).push(r); });
    const crossings: Array<{ sym: string; symKey: string; year: number }> = [];
    Object.entries(bySym).forEach(([sym, trades]) => {
        trades.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        let held = 0;
        let prevYear: number | null = null;
        for (const t of trades) {
            const y = t.when.getFullYear();
            if (prevYear !== null && y !== prevYear && held !== 0) {
                for (let yr = prevYear; yr < y; yr++) {
                    const symKey = sym.replace(/^\//, '');
                    if (!crossings.find(c => c.symKey === symKey && c.year === yr))
                        crossings.push({ sym, symKey, year: yr });
                }
            }
            held += t.quantity;
            prevYear = y;
        }
    });
    return crossings;
};

const computeTableGroups = (raw: TradeRecord[], endYearValues: Record<string, number> = {}) => {

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

        const symKey = sym.replace(/^\//, '');
        const base = parseFuturesSymbol(sym)?.base ?? 'NQ';
        const mult = FUTURES_MULTIPLIERS[base] ?? 20;

        let prevHeld = 0;
        let prevAvg: number | undefined = undefined;
        let cum = 0;
        let prevYear: number | null = null;
        const finalList: TableRow[] = [];

        for (const r of list) {
            const rYear = r.when.getFullYear();

            // Insert synthetic YEAR END row(s) when position crosses a year boundary
            if (prevYear !== null && rYear !== prevYear && prevHeld !== 0) {
                for (let y = prevYear; y < rYear; y++) {
                    const endPrice = endYearValues[symKey];
                    if (endPrice !== undefined && prevAvg !== undefined) {
                        const gl = (endPrice - prevAvg) * prevHeld * mult;
                        cum += gl;
                        const yeDt = new Date(y, 11, 31, 23, 59, 59);
                        finalList.push({
                            id: `YEAREND_${symKey}_${y}`,
                            when: yeDt,
                            quantity: 0,
                            symbol: sym,
                            price: endPrice,
                            held: prevHeld,
                            average: endPrice,
                            gainLoss: gl,
                            profits: cum,
                            week: getWeekNumber(yeDt),
                            year: y,
                            isYearEnd: true,
                        });
                        prevAvg = endPrice; // new cost basis for the new year
                    }
                }
            }

            // Normal trade row
            const held = prevHeld + r.quantity;
            let avg: number | undefined = undefined;

            if (prevAvg === undefined && Math.abs(held) !== 0) {
                avg = r.price;
            } else if (held !== 0) {
                if (Math.abs(prevHeld) > Math.abs(held) && prevAvg !== undefined) {
                    avg = prevAvg;
                } else {
                    avg = ((prevAvg ?? 0) * prevHeld + r.quantity * r.price) / held;
                }
            }

            let gl = 0;
            if (prevHeld !== 0 && Math.abs(prevHeld) > Math.abs(held) && prevAvg !== undefined) {
                const closed = prevHeld - held;
                gl = (r.price - prevAvg) * closed * mult;
            }

            cum += gl;
            const week = getWeekNumber(r.when);

            r.held = held;
            r.average = avg;
            r.gainLoss = gl;
            r.profits = cum;
            r.week = week;
            r.year = rYear;

            finalList.push(r);
            prevHeld = held;
            prevAvg = avg;
            prevYear = rYear;
        }

        groups[sym] = finalList;

        // aggregate by week for this symbol's rows
        finalList.forEach(r => {
            const keyYear = r.year;
            if (!byWeekMap[keyYear]) byWeekMap[keyYear] = [];
            const bucket = byWeekMap[keyYear];
            let entry = bucket.find(e => e.week === r.week);
            if (!entry) {
                entry = { year: r.year, week: r.week, profits: 0, trades: 0, cumulative: 0 };
                bucket.push(entry);
            }
            entry.profits += r.gainLoss;
            entry.trades += Math.abs(r.quantity); // year-end rows have qty=0, no effect
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
        bucket.forEach(e => { cum += e.profits; e.cumulative = cum; });
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

// ─── Shared styles ───────────────────────────────────────────────────────────
const eyebrowStyle:    React.CSSProperties = { fontFamily: 'Share Tech Mono,monospace', fontSize: '0.7rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#f59e0b', margin: '0 0 0.3rem' };
const pageTitleStyle:  React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontSize: '2.6rem', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#001830', margin: '0 0 0.5rem', lineHeight: 1 };
const ruleStyle:       React.CSSProperties = { width: 56, height: 2, background: 'linear-gradient(90deg,transparent,#f59e0b,transparent)', margin: '0 auto', border: 'none' };
const cardStyle:       React.CSSProperties = { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,24,48,0.12)', borderRadius: '2px 2px 8px 8px', marginBottom: '1.5rem', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,24,48,0.09)' };
const cardHeaderStyle: React.CSSProperties = { background: '#001830', borderBottom: '2px solid #f59e0b', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' };
const cardTitleStyle:  React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#dde6f0' };
const cardYearStyle:   React.CSSProperties = { fontFamily: 'Share Tech Mono,monospace', fontSize: '0.75rem', color: '#f59e0b', letterSpacing: '0.1em' };
const cardBodyStyle:   React.CSSProperties = { padding: '1.25rem 1.5rem' };
const labelStyle:      React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#6a9ac4', marginBottom: '0.4rem' };
const pillBtnStyle:    React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', border: '1.5px solid #001830', borderRadius: 4, padding: '0.38rem 0.9rem', cursor: 'pointer', transition: 'background 0.15s,color 0.15s' };
const runBtnStyle:     React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: '#001830', color: '#f59e0b', border: '1.5px solid #001830', borderRadius: 4, padding: '0.5rem 1.3rem', cursor: 'pointer' };
const thS:             React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', background: '#001830', color: '#dde6f0', whiteSpace: 'nowrap' };
const tdS:             React.CSSProperties = { fontFamily: 'Share Tech Mono,monospace', fontSize: '0.78rem', padding: '4px 10px', whiteSpace: 'nowrap' };
const tableStyle:      React.CSSProperties = { borderCollapse: 'collapse', fontSize: '0.78rem', width: '100%' };

// ─── Futures multipliers ─────────────────────────────────────────────────────
/**
 * Dollar gain per $1 price move per contract.
 * Source: CME Group contract specs.
 */
export const FUTURES_MULTIPLIERS: Record<string, number> = {
    // ── Equity Index ──────────────────────────────────────────
    NQ:  20,       // Nasdaq-100 E-mini
    ES:  50,       // S&P 500 E-mini
    YM:  5,        // Dow Jones E-mini
    RTY: 50,       // Russell 2000 E-mini
    MNQ: 2,        // Micro Nasdaq-100
    MES: 5,        // Micro S&P 500
    MYM: 0.50,     // Micro Dow Jones
    M2K: 5,        // Micro Russell 2000
    // ── Energy ────────────────────────────────────────────────
    CL:  1000,     // Crude Oil (WTI)
    BZ:  1000,     // Brent Crude Oil
    NG:  10000,    // Natural Gas
    RB:  42000,    // RBOB Gasoline
    HO:  42000,    // Heating Oil
    // ── Metals ────────────────────────────────────────────────
    GC:  100,      // Gold
    SI:  5000,     // Silver
    HG:  25000,    // Copper
    PL:  50,       // Platinum
    PA:  100,      // Palladium
    // ── Interest Rates ────────────────────────────────────────
    ZB:  1000,     // 30-Year U.S. T-Bond
    ZN:  1000,     // 10-Year T-Note
    ZF:  1000,     // 5-Year T-Note
    ZT:  2000,     // 2-Year T-Note
    // ── FX ────────────────────────────────────────────────────
    '6E': 125000,  // Euro FX
    '6B': 62500,   // British Pound
    '6J': 12500000,// Japanese Yen (per 1 JPY move; price quoted in units)
    '6C': 100000,  // Canadian Dollar
    '6A': 100000,  // Australian Dollar
    '6S': 125000,  // Swiss Franc
    '6N': 100000,  // New Zealand Dollar
    // ── Grains & Softs ────────────────────────────────────────
    ZC:  50,       // Corn
    ZS:  50,       // Soybeans
    ZW:  50,       // Wheat
    ZL:  600,      // Soybean Oil
    ZM:  100,      // Soybean Meal
    KC:  375,      // Coffee C
    CT:  500,      // Cotton No. 2
    SB:  1120,     // Sugar No. 11
    CC:  10,       // Cocoa
    OJ:  150,      // Orange Juice
    // ── Livestock ─────────────────────────────────────────────
    LE:  400,      // Live Cattle
    GF:  500,      // Feeder Cattle
    HE:  400,      // Lean Hogs
};

/**
 * Per-contract round-trip commission in dollars.
 * Unknown instruments default to the NQ rate — update each entry when confirmed.
 */
export const FUTURES_COMMISSIONS: Record<string, number> = {
    NQ:  3.25,   // Nasdaq-100 E-mini
    // ES:  3.25,  // S&P 500 E-mini    — update when known
    // YM:  3.25,  // Dow Jones E-mini  — update when known
    // CL:  3.25,  // Crude Oil         — update when known
    // GC:  3.25,  // Gold              — update when known
    // SI:  3.25,  // Silver            — update when known
    // PL:  3.25,  // Platinum          — update when known
};

/**
 * Parses any futures symbol (e.g. "/NQU24", "/SIH25") into its components.
 * Returns null if the symbol doesn't match the pattern.
 */
const parseFuturesSymbol = (s: string): { base: string; letter: string; year2: string } | null => {
    const m = /^\/?(.+)([FGHJKMNQUVXZ])(\d{2})$/.exec(s);
    if (!m) return null;
    return { base: m[1], letter: m[2], year2: m[3] };
};

const UploadPanel: FC<{ maxDate: Date; pb: PocketBase; onReload: () => void }> = ({ maxDate, pb, onReload }) => {
    const [proc, setProc] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [added, setAdded] = useState(0);
    const [rejected, setRejected] = useState(0);
    const [other, setOther] = useState<any>(null);
    const [progress, setProgress] = useState(0);   // 0-100
    const [progressCur, setProgressCur] = useState(0);
    const [progressTotal, setProgressTotal] = useState(0);

    const upload = async (e: ChangeEvent<HTMLInputElement>) => {
        setProc(true);
        setErr(null);
        setTotal(0);
        setAdded(0);
        setRejected(0);
        setOther(null);
        setProgress(0);
        setProgressCur(0);
        setProgressTotal(0);

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

            // Pre-parse timestamps and sort ascending so the monotonic bump works correctly
            // regardless of whether the CSV is reverse-chronological (TD Ameritrade exports
            // newest-first, which would anchor nextAllowedMs to the most recent trade and
            // then bump every older trade forward from there).
            type ParsedRow = { row: Record<string, string>; dt: Date };
            const parsedRows: ParsedRow[] = [];
            for (const row of rows) {
                const dt = new Date(row['exec time']);
                if (!isNaN(dt.getTime())) {
                    parsedRows.push({ row, dt });
                } else {
                    r++;
                }
            }
            parsedRows.sort((a, b) => a.dt.getTime() - b.dt.getTime());
            setProgressTotal(parsedRows.length);
            setProgressCur(0);

            // Monotonic bump: if two rows share the same second, give each one a unique +1s slot.
            // Sorting first ensures the same CSV always produces the same ID sequence (idempotent).
            let nextAllowedMs = 0;

            for (const { row, dt } of parsedRows) {
                t++;
                setProgressCur(t);
                setProgress(Math.round((t / parsedRows.length) * 100));
                try {
                    // Bump timestamp forward if it collides with one already used this session
                    const effectiveMs = Math.max(dt.getTime(), nextAllowedMs);
                    nextAllowedMs = effectiveMs + 1000;
                    const effectiveDt = new Date(effectiveMs);

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

                    // FUTURES detection: any symbol starting with '/'
                    const isFuture = symbol.startsWith('/');
                    if (isFuture) {
                        // prevent duplicates by id
                        const when = effectiveDt.toISOString();
                        const id = ToId(effectiveDt);
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
                        const when = effectiveDt.toISOString();
                        const id = ToId(effectiveDt);
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
        <div style={cardStyle}>
            <div style={cardHeaderStyle}>
                <span style={cardTitleStyle}>Upload Trades CSV — last record 4/17/2026</span>
            </div>
            <div style={cardBodyStyle}>
                <p style={{ fontFamily: 'Rajdhani,sans-serif', color: '#6a9ac4', fontSize: '0.88rem', marginBottom: '1rem' }}>
                    Save statement CSV from Think Or Swim and upload the file here.
                </p>
                {proc && (
                    <div style={{ maxWidth: 360, marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Share Tech Mono,monospace', fontSize: '0.75rem', color: '#6a9ac4', marginBottom: '0.3rem' }}>
                            <span>Processing…</span>
                            <span>{progress}%</span>
                        </div>
                        <div style={{ background: '#dde6f0', borderRadius: 3, height: 8, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progress}%`, background: '#f59e0b', borderRadius: 3, transition: 'width 0.1s ease' }} />
                        </div>
                        {progressTotal > 0 && <p style={{ fontFamily: 'Share Tech Mono,monospace', fontSize: '0.72rem', color: '#6a9ac4', marginTop: '0.35rem', marginBottom: 0 }}>
                            {progressCur} / {progressTotal} &nbsp;·&nbsp; +{added} accepted &nbsp;·&nbsp; {rejected} skipped
                        </p>}
                    </div>
                )}
                {!proc && total > 0 && (
                    <p style={{ fontFamily: 'Share Tech Mono,monospace', fontSize: '0.78rem', color: '#001830', marginBottom: '0.75rem' }}>
                        Scanned: {total} &nbsp;|&nbsp; Added: {added} &nbsp;|&nbsp; Rejected: {rejected}
                    </p>
                )}
                <Form.Control type="file" accept=".csv" onChange={upload} disabled={proc} className="mb-2" style={{ maxWidth: 360 }} />
                {err && <p style={{ color: '#dc2626', fontFamily: 'Share Tech Mono,monospace', fontSize: '0.78rem', marginTop: '0.5rem' }}>{err}</p>}
            </div>
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
/** Maps expiration letter → quarter label */
/** Full CME futures month-code → abbreviated month name */
const LETTER_TO_MONTH: Record<string, string> = {
    F: 'Jan', G: 'Feb', H: 'Mar', J: 'Apr', K: 'May', M: 'Jun',
    N: 'Jul', Q: 'Aug', U: 'Sep', V: 'Oct', X: 'Nov', Z: 'Dec',
};

const TablePanel: FC<{ groups: Groups }> = ({ groups }) => {
    const [sel, setSel]                       = useState('');
    const [rows, setRows]                     = useState<TableRow[]>([]);
    const [sortAsc, setSortAsc]               = useState(true);
    const [selType, setSelType]               = useState('');   // base symbol e.g. "NQ"
    const [selYear, setSelYear]               = useState('');   // 2-digit e.g. "26"
    const [selLetter, setSelLetter]           = useState('');   // expiration letter e.g. "U"

    /** All recognisable futures symbols from groups, parsed */
    const parsedSymbols = useMemo(() => {
        return Object.keys(groups)
            .map(s => ({ raw: s, parsed: parseFuturesSymbol(s) }))
            .filter((x): x is { raw: string; parsed: NonNullable<ReturnType<typeof parseFuturesSymbol>> } =>
                x.parsed !== null)
            .sort((a, b) => {
                if (a.parsed.base !== b.parsed.base) return a.parsed.base.localeCompare(b.parsed.base);
                const ya = parseInt(a.parsed.year2), yb = parseInt(b.parsed.year2);
                if (yb !== ya) return yb - ya;
                return b.parsed.letter.localeCompare(a.parsed.letter);
            });
    }, [groups]);

    /** Unique base symbols (NQ, SI, PL …), alphabetical */
    const availableTypes = useMemo(() =>
        Array.from(new Set(parsedSymbols.map(x => x.parsed.base))).sort(),
        [parsedSymbols]
    );

    /** Years available for the selected type, newest first */
    const availableYears = useMemo(() =>
        Array.from(new Set(
            parsedSymbols.filter(x => x.parsed.base === selType).map(x => x.parsed.year2)
        )).sort((a, b) => parseInt(b) - parseInt(a)),
        [parsedSymbols, selType]
    );

    /** Expiration letters available for the selected type + year, in month order */
    const availableLetters = useMemo(() => {
        const monthOrder = Object.keys(LETTER_TO_MONTH);
        return parsedSymbols
            .filter(x => x.parsed.base === selType && x.parsed.year2 === selYear)
            .map(x => x.parsed.letter)
            .filter(l => LETTER_TO_MONTH[l])
            .sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
    }, [parsedSymbols, selType, selYear]);

    /** Init type (prefer NQ, else first available) */
    useEffect(() => {
        if (!availableTypes.length || selType) return;
        setSelType(availableTypes.includes('NQ') ? 'NQ' : availableTypes[0]);
    }, [availableTypes]);

    /** When type changes, reset year to current or newest */
    useEffect(() => {
        if (!availableYears.length) return;
        const curYear2 = String(new Date().getFullYear()).slice(-2);
        const best = availableYears.includes(curYear2) ? curYear2 : availableYears[0];
        if (selYear !== best) setSelYear(best);
    }, [selType, availableYears]);

    /** When year changes, keep letter if still valid, else pick the last available month */
    useEffect(() => {
        if (!availableLetters.length) return;
        if (!availableLetters.includes(selLetter))
            setSelLetter(availableLetters[availableLetters.length - 1]);
    }, [selYear, availableLetters]);

    /** Resolve sel from type + year + letter */
    useEffect(() => {
        if (!selType || !selYear || !selLetter) return;
        const hit = parsedSymbols.find(
            x => x.parsed.base === selType && x.parsed.year2 === selYear && x.parsed.letter === selLetter
        );
        setSel(hit ? hit.raw : '');
    }, [selType, selYear, selLetter, parsedSymbols]);

    useEffect(() => {
        let newRows = sel ? (groups[sel] ?? []) : [];
        newRows = [...newRows].sort((a, b) =>
            sortAsc ? a.when.getTime() - b.when.getTime() : b.when.getTime() - a.when.getTime()
        );
        setRows(newRows);
    }, [sel, groups, sortAsc]);

    const toggleSort = () => setSortAsc(prev => !prev);

    const selectStyle: React.CSSProperties = {
        fontFamily: 'Share Tech Mono,monospace',
        fontSize: '0.82rem',
        border: '1.5px solid #001830',
        borderRadius: 4,
        padding: '0.35rem 0.6rem',
        background: 'white',
        color: '#001830',
        cursor: 'pointer',
    };

    const mult = selType ? (FUTURES_MULTIPLIERS[selType] ?? '—') : '—';

    return (
        <div>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={labelStyle}>Type</span>
                    <select style={selectStyle} value={selType} onChange={e => { setSelType(e.target.value); setSelYear(''); setSelLetter(''); }}>
                        {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={labelStyle}>Year</span>
                    <select style={selectStyle} value={selYear} onChange={e => setSelYear(e.target.value)}>
                        {availableYears.map(y => <option key={y} value={y}>20{y}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={labelStyle}>Month</span>
                    <select style={selectStyle} value={selLetter} onChange={e => setSelLetter(e.target.value)}>
                        {availableLetters.map(l => (
                            <option key={l} value={l}>{LETTER_TO_MONTH[l]} — {l}</option>
                        ))}
                    </select>
                </div>
                {sel && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={labelStyle}>Contract</span>
                        <span style={{ fontFamily: 'Share Tech Mono,monospace', fontSize: '1.05rem', fontWeight: 700, color: '#001830', letterSpacing: '0.08em' }}>
                            {sel}
                            <span style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 400, fontSize: '0.78rem', color: '#6a9ac4', marginLeft: '0.6rem' }}>
                                ${mult}/pt
                            </span>
                        </span>
                    </div>
                )}
            </div>
            {rows.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={{ ...thS, cursor: 'pointer' }} onClick={toggleSort}>
                                    Exec Time {sortAsc ? '▲' : '▼'}
                                </th>
                                {['Qty', 'Symbol', 'Price', 'Held', 'Average', 'Gain/Loss', 'Profits', 'WW'].map(h => (
                                    <th key={h} style={thS}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => r.isYearEnd ? (
                                <tr key={r.id} style={{ background: 'rgba(245,158,11,0.13)', fontWeight: 700 }}>
                                    <td style={{ ...tdS, fontFamily: 'Share Tech Mono,monospace', color: '#92400e', letterSpacing: '0.08em' }}>YEAR END</td>
                                    <td style={tdS}></td>
                                    <td style={tdS}>{r.symbol}</td>
                                    <td style={tdS}>{`$${r.price.toFixed(2)}`}</td>
                                    <td style={tdS}></td>
                                    <td style={tdS}>{formatDollar(r.average)}</td>
                                    <td style={{ ...tdS, color: r.gainLoss >= 0 ? '#166534' : '#991b1b' }}>{formatDollar(r.gainLoss)}</td>
                                    <td style={tdS}>{formatDollar(r.profits)}</td>
                                    <td style={tdS}></td>
                                </tr>
                            ) : (
                                <tr key={`${r.id}-${i}`} style={{ background: i % 2 ? 'rgba(0,24,48,0.03)' : 'white' }}>
                                    <td style={tdS}>{r.when.toLocaleString()}</td>
                                    <td style={tdS}>{r.quantity}</td>
                                    <td style={tdS}>{r.symbol}</td>
                                    <td style={tdS}>{`$${r.price.toFixed(2)}`}</td>
                                    <td style={tdS}>{r.held}</td>
                                    <td style={tdS}>{formatDollar(r.average)}</td>
                                    <td style={tdS}>{formatDollar(r.gainLoss)}</td>
                                    <td style={tdS}>{formatDollar(r.profits)}</td>
                                    <td style={tdS}>{r.week}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
    const rows = useMemo(() => Object.values(groups).flat(), [groups]);

    /**
     * Build: year (desc) → types (asc) → contracts.
     * Each contract entry tracks gains/losses/trades for one specific symbol.
     */
    const byYear = useMemo(() => {
        type Entry = { symbol: string; gains: number; losses: number; trades: number };
        type TypeSection = { base: string; contracts: Record<string, Entry> };
        const yearMap: Record<number, Record<string, TypeSection>> = {};

        rows.forEach(r => {
            const base = parseFuturesSymbol(r.symbol)?.base ?? r.symbol;
            const year = r.when.getFullYear();
            if (!yearMap[year]) yearMap[year] = {};
            if (!yearMap[year][base]) yearMap[year][base] = { base, contracts: {} };
            if (!yearMap[year][base].contracts[r.symbol])
                yearMap[year][base].contracts[r.symbol] = { symbol: r.symbol, gains: 0, losses: 0, trades: 0 };
            const c = yearMap[year][base].contracts[r.symbol];
            if (r.gainLoss > 0) c.gains  += r.gainLoss;
            if (r.gainLoss < 0) c.losses += r.gainLoss;
            c.trades += Math.abs(r.quantity);
        });

        return Object.keys(yearMap)
            .map(Number)
            .sort((a, b) => b - a)
            .map(year => ({
                year,
                types: Object.values(yearMap[year]).sort((a, b) => a.base.localeCompare(b.base)),
            }));
    }, [rows]);

    const yearBannerStyle: React.CSSProperties = {
        fontFamily: 'Share Tech Mono,monospace',
        fontSize: '1.4rem',
        fontWeight: 700,
        color: '#001830',
        letterSpacing: '0.15em',
        padding: '0.5rem 0 0.4rem',
        borderBottom: '2px solid #f59e0b',
        marginBottom: '1rem',
    };

    return (
        <div>
            {byYear.map(({ year, types }) => {
                const yearNet = types.reduce((sum, { contracts }) => {
                    const entries = Object.values(contracts);
                    return sum + entries.reduce((s, e) => s + e.gains + e.losses, 0);
                }, 0);
                const now = new Date();
                const isCurrentYear = year === now.getFullYear();
                const startOfYear = new Date(year, 0, 1).getTime();
                const startOfNextYear = new Date(year + 1, 0, 1).getTime();
                const pctElapsed = (now.getTime() - startOfYear) / (startOfNextYear - startOfYear);
                const estimated = pctElapsed > 0 ? yearNet / pctElapsed : 0;
                return (
                <div key={year} style={{ marginBottom: '2rem' }}>
                    <div style={{ ...yearBannerStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span>{year}</span>
                        <span style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                            <span style={{ fontSize: '1.1rem', color: yearNet >= 0 ? '#166534' : '#991b1b' }}>
                                {formatDollar(yearNet, true)}
                            </span>
                            {isCurrentYear && (
                                <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '0.82rem', fontWeight: 600, color: '#6a9ac4', letterSpacing: '0.04em' }}>
                                    (est. {formatDollar(estimated, true)})
                                </span>
                            )}
                        </span>
                    </div>

                    {types.map(({ base, contracts }) => {
                        const entries  = Object.values(contracts);
                        const tg       = entries.reduce((s, e) => s + e.gains,  0);
                        const tl       = entries.reduce((s, e) => s + e.losses, 0);
                        const tt       = entries.reduce((s, e) => s + e.trades, 0);
                        const commRate = FUTURES_COMMISSIONS[base] ?? FUTURES_COMMISSIONS['NQ'] ?? 3.25;
                        const comm     = -commRate * tt;

                        return (
                            <div key={base} style={{ ...cardStyle, marginBottom: '1rem' }}>
                                <div style={cardHeaderStyle}>
                                    <span style={cardTitleStyle}>{base}</span>
                                </div>
                                <div style={cardBodyStyle}>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={tableStyle}>
                                            <thead>
                                                <tr>{['Contract', 'Gains', 'Losses', 'Net', 'Trades'].map(h =>
                                                    <th key={h} style={thS}>{h}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {entries.map((e, i) => {
                                                    const net = e.gains + e.losses;
                                                    return (
                                                        <tr key={e.symbol} style={{ background: i % 2 ? 'rgba(0,24,48,0.03)' : 'white' }}>
                                                            <td style={tdS}>{e.symbol}</td>
                                                            <td style={tdS}>{formatDollar(e.gains, true)}</td>
                                                            <td style={tdS}>{formatDollar(-e.losses, true)}</td>
                                                            <td style={tdS}>{formatDollar(net, true)}</td>
                                                            <td style={tdS}>{e.trades}</td>
                                                        </tr>
                                                    );
                                                })}
                                                <tr style={{ background: '#001830' }}>
                                                    <td style={{ ...tdS, color: '#f59e0b', fontWeight: 700 }}>Total</td>
                                                    <td style={{ ...tdS, color: '#dde6f0' }}>{formatDollar(tg, true)}</td>
                                                    <td style={{ ...tdS, color: '#dde6f0' }}>{formatDollar(-tl, true)}</td>
                                                    <td style={{ ...tdS, color: '#dde6f0' }}>{formatDollar(tg + tl, true)}</td>
                                                    <td style={{ ...tdS, color: '#dde6f0' }}>{tt}</td>
                                                </tr>
                                                <tr style={{ background: 'rgba(245,158,11,0.08)' }}>
                                                    <td style={{ ...tdS, fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, color: '#6a9ac4' }}>
                                                        Commissions
                                                        <span style={{ fontWeight: 400, fontSize: '0.7rem', marginLeft: '0.4rem' }}>
                                                            (${commRate}/contract)
                                                        </span>
                                                    </td>
                                                    <td style={tdS} colSpan={3}></td>
                                                    <td style={tdS}>{formatDollar(comm, true)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
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
    const allSorted = useMemo(() => {
        const flat = byWeeks.flat().filter(Boolean) as WEntry[];
        return flat.sort((a, b) => a.year - b.year || a.week - b.week);
    }, [byWeeks]);

    const availableYears = useMemo(() =>
        Array.from(new Set(allSorted.map(e => e.year))).sort((a, b) => b - a),
        [allSorted]
    );

    const [selYear, setSelYear] = useState<number | 'all'>('all');

    // default to current year once data arrives
    useEffect(() => {
        if (availableYears.length === 0 || selYear !== 'all') return;
        const cur = new Date().getFullYear();
        setSelYear(availableYears.includes(cur) ? cur : availableYears[0]);
    }, [availableYears]);

    // filter + recompute cumulative for the selected year
    const display = useMemo(() => {
        const rows = selYear === 'all'
            ? allSorted
            : allSorted.filter(e => e.year === selYear);
        let cum = 0;
        return rows.map(e => ({ ...e, cumulative: (cum += e.profits) }));
    }, [allSorted, selYear]);

    const selectStyle: React.CSSProperties = {
        fontFamily: 'Share Tech Mono,monospace',
        fontSize: '0.82rem',
        border: '1.5px solid #001830',
        borderRadius: 4,
        padding: '0.35rem 0.6rem',
        background: 'white',
        color: '#001830',
        cursor: 'pointer',
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={labelStyle}>Year</span>
                    <select style={selectStyle} value={selYear} onChange={e => setSelYear(e.target.value === 'all' ? 'all' : +e.target.value)}>
                        <option value="all">All</option>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                    <thead>
                        <tr>{(selYear === 'all' ? ['Year', 'WW', 'Week Profits', 'Cumulative', 'Trades'] : ['WW', 'Week Profits', 'Cumulative', 'Trades']).map(h =>
                            <th key={h} style={thS}>{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {display.map((e, i) => (
                            <tr key={`${e.year}-${e.week}`} style={{ background: i % 2 ? 'rgba(0,24,48,0.03)' : 'white' }}>
                                {selYear === 'all' && <td style={tdS}>{e.year}</td>}
                                <td style={tdS}>{e.week}</td>
                                <td style={tdS}>{formatDollar(e.profits)}</td>
                                <td style={tdS}>{formatDollar(e.cumulative)}</td>
                                <td style={tdS}>{e.trades}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
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


const StocksPanel: FC<{ stocks: StockRecords; year: number; onYearChange: (y: number) => void }> = ({ stocks, year, onYearChange }) => {
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i);

    const selectStyle: React.CSSProperties = {
        fontFamily: 'Share Tech Mono,monospace',
        fontSize: '0.82rem',
        border: '1.5px solid #001830',
        borderRadius: 4,
        padding: '0.35rem 0.6rem',
        background: 'white',
        color: '#001830',
        cursor: 'pointer',
    };

    const closedTotal = Object.values(stocks)
        .filter(s => s.totalQuantity === 0)
        .reduce((sum, s) => sum + s.gain, 0);
    const hasData = Object.keys(stocks).length > 0;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={labelStyle}>Year</span>
                    <select style={selectStyle} value={year} onChange={e => onYearChange(+e.target.value)}>
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                {!hasData && (
                    <span style={{ fontFamily: 'Share Tech Mono,monospace', fontSize: '0.78rem', color: '#6a9ac4' }}>
                        No closed positions found for {year}.
                    </span>
                )}
                {hasData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={labelStyle}>Total</span>
                        <span style={{
                            fontFamily: 'Share Tech Mono,monospace',
                            fontSize: '1.05rem',
                            fontWeight: 700,
                            color: closedTotal >= 0 ? '#15803d' : '#dc2626',
                        }}>
                            {formatDollar(closedTotal)}
                        </span>
                    </div>
                )}
            </div>
            {Object.keys(stocks).map((symbol, i) => (
                <div key={i} style={{ ...cardStyle, marginBottom: '1.5rem' }}>
                    <div style={cardHeaderStyle}>
                        <span style={cardTitleStyle}>{symbol}</span>
                    </div>
                    <div style={cardBodyStyle}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>{['Exec Time', 'Price', 'Qty', 'Effect'].map(h => <th key={h} style={thS}>{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {stocks[symbol].trades.map((move, j) => (
                                        <tr key={`${i}-${j}`} style={{ background: j % 2 ? 'rgba(0,24,48,0.03)' : 'white' }}>
                                            <td style={tdS}>{move.when.toLocaleString()}</td>
                                            <td style={tdS}>{formatDollar(move.price, false)}</td>
                                            <td style={tdS}>{move.quantity}</td>
                                            <td style={tdS}>{move.effect ? 'TO OPEN' : 'TO CLOSE'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: '#001830' }}>
                                        <td style={{ ...tdS, color: '#dde6f0' }} colSpan={2}>Total</td>
                                        <td style={{ ...tdS, color: '#f59e0b', fontWeight: 700 }}>{stocks[symbol].totalQuantity}</td>
                                        <td style={{ ...tdS, color: '#dde6f0' }}>{stocks[symbol].totalQuantity == 0 ? formatDollar(stocks[symbol].gain) : '--'}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            ))}
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
        * - Processes any futures contract with a leading '/' (NQ, ES, SI, PL, CL, GC, …)
        * - Calculates position-based P&L with average cost tracking
        * - Supports commission calculations at $3.25 per contract
        * - Uses Chart.js for interactive visualizations
        * - Implements quarterly guide lines on charts for easy time reference
        */

// ---------------------------------------------------------------------------
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
    const [key, setKey] = useState<'table' | 'summary' | 'weeks' | 'chart1' | 'chart2' | 'chart3' | 'stocks' | 'history'>('table');
    /** Reload trigger for refreshing data after uploads */
    const [reloadFlag, setReloadFlag] = useState(0);
    /** Selected year for the Stocks tab */
    const [stocksYear, setStocksYear] = useState(new Date().getFullYear());
    /** Which futures types are enabled for the Weeks / chart tabs */
    const [selTypes, setSelTypes] = useState<Set<string>>(new Set());
    /** Year-end closing prices keyed by symbol (e.g. NQH25) — stored in miscellaneous:00endyearvalues */
    const [endYearValues, setEndYearValues] = useState<Record<string, number>>({});
    /** Raw trade records, kept so we can recompute without re-fetching after saving year-end values */
    const [rawTrades, setRawTrades] = useState<TradeRecord[]>([]);
    /** Symbol+year pairs that need a year-end value but don't have one yet */
    const [missingYearEnds, setMissingYearEnds] = useState<Array<{ sym: string; symKey: string; year: number }>>([]);
    /** User inputs for missing year-end values (symKey → string) */
    const [yearEndInputs, setYearEndInputs] = useState<Record<string, string>>({});
    const [yearEndSaving, setYearEndSaving] = useState(false);
    const [yearEndError, setYearEndError] = useState<string | null>(null);
    const [yearEndRecordExists, setYearEndRecordExists] = useState(false);

    /** Load and process futures trading data from the trades collection. */
    useEffect(() => {
        Promise.all([
            pb.collection('trades').getFullList<any>({ sort: 'when' }),
            pb.collection('miscellaneous').getOne('00endyearvalues').catch(() => null),
        ]).then(([all, eyvRecord]) => {
            const endVals: Record<string, number> = eyvRecord
                ? (() => {
                    const d = eyvRecord.data;
                    if (typeof d === 'object' && d !== null) return d as Record<string, number>;
                    try { return JSON.parse(d || '{}'); } catch { return {}; }
                  })()
                : {};
            setYearEndRecordExists(!!eyvRecord);
            const recs: TradeRecord[] = all.map(r => ({ id: r.id, when: new Date(r.when), quantity: +r.quantity, symbol: r.symbol, price: +r.price }));
            const maxDate = recs.length > 0
                ? new Date(Math.max(...recs.map(d => d.when.getTime())))
                : new Date(0);
            const crossings = findYearCrossings(recs);
            const missing = crossings.filter(c => endVals[c.symKey] === undefined);
            const { groups, byWeek } = computeTableGroups(recs, endVals);
            setRawTrades(recs);
            setEndYearValues(endVals);
            setMissingYearEnds(missing);
            setMaxDate(maxDate);
            setGroups(groups);
            setByWeeks(byWeek);
        });
    }, [pb, reloadFlag]);

    /** Save entered year-end values to miscellaneous and recompute groups. */
    const saveYearEndValues = async () => {
        setYearEndSaving(true);
        setYearEndError(null);
        const newVals = { ...endYearValues };
        for (const { symKey } of missingYearEnds) {
            const v = parseFloat(yearEndInputs[symKey] ?? '');
            if (!isNaN(v) && v > 0) newVals[symKey] = v;
        }
        try {
            const payload = { data: newVals };
            if (yearEndRecordExists) {
                await pb.collection('miscellaneous').update('00endyearvalues', payload);
            } else {
                await pb.collection('miscellaneous').create({ id: '00endyearvalues', ...payload });
                setYearEndRecordExists(true);
            }
            const still = missingYearEnds.filter(c => newVals[c.symKey] === undefined);
            const { groups, byWeek } = computeTableGroups(rawTrades, newVals);
            setEndYearValues(newVals);
            setMissingYearEnds(still);
            setGroups(groups);
            setByWeeks(byWeek);
            setYearEndInputs({});
        } catch (err: any) {
            const msg = err?.response?.message ?? err?.message ?? String(err);
            console.error('Failed to save year-end values', err);
            setYearEndError(msg);
        } finally {
            setYearEndSaving(false);
        }
    };

    /** Load stocks/options for the selected year. */
    useEffect(() => {
        const startId = ToId(new Date(stocksYear,     0, 1, 0, 0, 0, 0));
        const endId   = ToId(new Date(stocksYear + 1, 0, 1, 0, 0, 0, 0));
        const stockRecords: StockRecords = {};

        pb.collection('stocks').getFullList<any>({
            filter: `id >= "${startId}" && id < "${endId}" && effect = false`,
        }).then(async (res) => {
            res.forEach(r => {
                let symbol = r.symbol;
                const futBase = parseFuturesSymbol(r.symbol)?.base;
                let multiplier = futBase ? (FUTURES_MULTIPLIERS[futBase] ?? 1) : 1;
                if (r.spread.includes("SINGLE")) {
                    multiplier = 100;
                    symbol += ` ${r.type} $${r.strike} Exp: ${r.expiration}`;
                }
                if (!stockRecords[symbol]) {
                    stockRecords[symbol] = {
                        symbol: r.symbol, spread: r.spread, expiration: r.expiration,
                        strike: r.strike, type: r.type, totalQuantity: 0, gain: 0, multiplier, trades: [],
                    };
                }
                stockRecords[symbol].totalQuantity += +r.quantity;
                stockRecords[symbol].gain -= r.quantity * r.price * multiplier;
                stockRecords[symbol].trades.push({
                    id: r.id, when: new Date(r.when), quantity: +r.quantity,
                    price: +r.price * multiplier, effect: r.effect,
                });
            });

            const stockValues = Object.values(stockRecords);
            for (const sr of stockValues) {
                try {
                    if (!sr.trades || sr.trades.length === 0) continue;
                    const short = sr.totalQuantity < 0;
                    sr.trades.sort((a, b) => a.when.getTime() - b.when.getTime());
                    const lastId = sr.trades[sr.trades.length - 1].id;

                    const more = await pb.collection('stocks').getFullList<any>({
                        filter: `id < ${JSON.stringify(lastId)} && effect = true && symbol = ${JSON.stringify(sr.symbol)} && spread = ${JSON.stringify(sr.spread)} && strike = ${JSON.stringify(sr.strike)} && expiration = ${JSON.stringify(sr.expiration)}`,
                        sort: '-when',
                    });

                    more.forEach(r => {
                        if ((short && sr.totalQuantity >= 0) || (!short && sr.totalQuantity <= 0)) return;
                        sr.trades.push({
                            id: r.id, when: new Date(r.when), quantity: +r.quantity,
                            price: +r.price * sr.multiplier, effect: r.effect,
                        });
                        sr.totalQuantity += +r.quantity;
                        sr.gain -= r.quantity * r.price * sr.multiplier;
                    });
                    sr.trades.sort((a, b) => a.when.getTime() - b.when.getTime());
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (err) {
                    console.error("Error fetching more stocks for", sr.symbol, err);
                }
            }
            setStocks(stockRecords);
        });
    }, [pb, reloadFlag, stocksYear]);

    /** Unique sorted base symbols present in the trades collection */
    const availableTypes = useMemo(() =>
        Array.from(new Set(
            Object.keys(groups)
                .map(s => parseFuturesSymbol(s)?.base)
                .filter((b): b is string => !!b)
        )).sort(),
        [groups]
    );

    /** When available types change (initial load / reload), enable all by default */
    useEffect(() => {
        setSelTypes(new Set(availableTypes));
    }, [availableTypes.join(',')]);

    /** byWeeks re-aggregated from only the selected types */
    const filteredByWeeks = useMemo(() => {
        const byWeekMap: Record<number, WEntry[]> = {};
        Object.entries(groups).forEach(([sym, rows]) => {
            const base = parseFuturesSymbol(sym)?.base;
            if (!base || !selTypes.has(base)) return;
            rows.forEach(r => {
                if (!byWeekMap[r.year]) byWeekMap[r.year] = [];
                let entry = byWeekMap[r.year].find(e => e.week === r.week);
                if (!entry) {
                    entry = { year: r.year, week: r.week, profits: 0, trades: 0, cumulative: 0 };
                    byWeekMap[r.year].push(entry);
                }
                entry.profits += r.gainLoss;
                entry.trades  += Math.abs(r.quantity);
            });
        });
        const result = Object.keys(byWeekMap)
            .map(k => ({ year: +k, entries: byWeekMap[+k] }))
            .sort((a, b) => a.year - b.year)
            .map(obj => obj.entries.sort((x, y) => x.week - y.week));
        result.forEach(bucket => {
            let cum = 0;
            bucket.forEach(e => { e.cumulative = (cum += e.profits); });
        });
        return result;
    }, [groups, selTypes]);

    /** Triggers data reload after successful CSV upload */
    const reload = () => setReloadFlag(f => f + 1);

    const [deleting2025, setDeleting2025] = useState(false);
    const [del2025Result, setDel2025Result] = useState<string | null>(null);
    const delete2025 = async () => {
        if (!window.confirm('Delete ALL trades and stocks records from 2025? This cannot be undone.')) return;
        setDeleting2025(true);
        setDel2025Result(null);
        try {
            const start = ToId(new Date(2025, 0, 1, 0, 0, 0, 0));
            const end   = ToId(new Date(2026, 0, 1, 0, 0, 0, 0));
            const filter = `id >= "${start}" && id < "${end}"`;
            const [tradeRecs, stockRecs] = await Promise.all([
                pb.collection('trades').getFullList({ filter }),
                pb.collection('stocks').getFullList({ filter }),
            ]);
            for (const r of tradeRecs) await pb.collection('trades').delete(r.id);
            for (const r of stockRecs) await pb.collection('stocks').delete(r.id);
            setDel2025Result(`Deleted ${tradeRecs.length} trade(s) and ${stockRecs.length} stock(s).`);
            reload();
        } catch (err: any) {
            setDel2025Result(`Error: ${err?.message ?? err}`);
        } finally {
            setDeleting2025(false);
        }
    };

    const tabs: { key: typeof key; label: string }[] = [
        { key: 'table',   label: 'Table'      },
        { key: 'summary', label: 'Summary'    },
        { key: 'weeks',   label: 'Weeks'      },
        { key: 'chart1',  label: 'Weekly P&L' },
        { key: 'chart2',  label: 'Cumulative' },
        { key: 'chart3',  label: 'Volume'     },
        { key: 'stocks',  label: 'Stocks'     },
        { key: 'history', label: 'History'    },
    ];

    return (
        <AdminPageLayout title="Futures">
            <div style={{ maxWidth: 1280, margin: '0 auto' }}>

                {/* Year-end value prompt */}
                {missingYearEnds.length > 0 && (
                    <div style={{ ...cardStyle, border: '2px solid #f59e0b', marginBottom: '1.5rem' }}>
                        <div style={{ ...cardHeaderStyle, background: '#78350f' }}>
                            <span style={cardTitleStyle}>Year-End Values Required</span>
                        </div>
                        <div style={cardBodyStyle}>
                            <p style={{ fontFamily: 'Rajdhani,sans-serif', color: '#92400e', fontWeight: 600, marginBottom: '1rem' }}>
                                The following futures were held across a year boundary. Enter the Dec 31 closing price for each to split P&L by calendar year.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                {missingYearEnds.map(({ symKey, year }) => (
                                    <div key={`${symKey}_${year}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontFamily: 'Share Tech Mono,monospace', fontWeight: 700, fontSize: '1rem', color: '#001830', minWidth: 120 }}>
                                            {symKey}
                                        </span>
                                        <span style={{ fontFamily: 'Rajdhani,sans-serif', color: '#6a9ac4', fontSize: '0.85rem' }}>
                                            Dec 31, {year} closing price:
                                        </span>
                                        <input
                                            type="number"
                                            step="0.25"
                                            placeholder="e.g. 21540.00"
                                            value={yearEndInputs[symKey] ?? ''}
                                            onChange={e => setYearEndInputs(prev => ({ ...prev, [symKey]: e.target.value }))}
                                            style={{ fontFamily: 'Share Tech Mono,monospace', fontSize: '0.9rem', border: '1.5px solid #f59e0b', borderRadius: 4, padding: '0.3rem 0.6rem', width: 160 }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <button
                                style={runBtnStyle}
                                onClick={saveYearEndValues}
                                disabled={yearEndSaving}
                            >
                                {yearEndSaving ? 'Saving…' : 'Save & Apply'}
                            </button>
                            {yearEndError && (
                                <span style={{ fontFamily: 'Share Tech Mono,monospace', fontSize: '0.8rem', color: '#dc2626', marginLeft: '1rem' }}>
                                    Error: {yearEndError}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Upload card */}
                <UploadPanel maxDate={maxDate} pb={pb} onReload={reload} />


                {/* Tab panel card */}
                <div style={cardStyle}>
                    <div style={{ ...cardHeaderStyle, gap: '0.4rem', flexWrap: 'wrap' }}>
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                style={{
                                    ...pillBtnStyle,
                                    background: key === t.key ? '#f59e0b' : 'transparent',
                                    color:      key === t.key ? '#001830' : '#dde6f0',
                                    border:     `1.5px solid ${key === t.key ? '#f59e0b' : 'rgba(255,255,255,0.2)'}`,
                                }}
                                onClick={() => setKey(t.key)}
                            >{t.label}</button>
                        ))}
                    </div>
                    <div style={cardBodyStyle}>
                        {/* Type filter toggles — shown for weeks + chart tabs */}
                        {(['weeks','chart1','chart2','chart3'] as const).includes(key as any) && availableTypes.length > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                <span style={labelStyle}>Types:</span>
                                {availableTypes.map(t => {
                                    const on = selTypes.has(t);
                                    return (
                                        <button key={t} style={{
                                            ...pillBtnStyle,
                                            background: on ? '#001830' : 'transparent',
                                            color:      on ? '#f59e0b' : '#001830',
                                        }} onClick={() => setSelTypes(prev => {
                                            const next = new Set(prev);
                                            on ? next.delete(t) : next.add(t);
                                            return next;
                                        })}>{t}</button>
                                    );
                                })}
                            </div>
                        )}
                        {key === 'table'   && <TablePanel groups={groups} />}
                        {key === 'summary' && <SummaryPanel groups={groups} />}
                        {key === 'weeks'   && <WeeksPanel byWeeks={filteredByWeeks} />}
                        {key === 'chart1'  && <div style={{ height: 420 }}><WeeksProfitChart byWeeks={filteredByWeeks} /></div>}
                        {key === 'chart2'  && <div style={{ height: 420 }}><CumulativeProfitChart byWeeks={filteredByWeeks} /></div>}
                        {key === 'chart3'  && <div style={{ height: 420 }}><WeeksTradeChart byWeeks={filteredByWeeks} /></div>}
                        {key === 'stocks'  && <StocksPanel stocks={stocks} year={stocksYear} onYearChange={setStocksYear} />}
                        {key === 'history' && <DjiHistoryPanel />}
                    </div>
                </div>

            </div>
        </AdminPageLayout>
    );
};

// ─── DJI History Panel ────────────────────────────────────────────────────────

interface DjiRow { date: string; close: number; }

function aggregateMonthly(rows: DjiRow[]): DjiRow[] {
    const map = new Map<string, number[]>();
    for (const r of rows) {
        const key = r.date.slice(0, 7); // YYYY-MM
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r.close);
    }
    return Array.from(map.entries()).map(([k, vals]) => ({
        date: k + '-01',
        close: Math.round(vals[vals.length - 1] * 100) / 100,
    }));
}

function aggregateYearly(rows: DjiRow[]): DjiRow[] {
    const map = new Map<string, number>();
    for (const r of rows) {
        map.set(r.date.slice(0, 4), r.close);
    }
    return Array.from(map.entries()).map(([k, close]) => ({ date: k + '-01-01', close }));
}

type IndexKey = 'dji' | 'nasdaq';
const INDEX_META: Record<IndexKey, { file: string; label: string; defaultStart: string }> = {
    dji:    { file: '/dji_full.csv',    label: 'Dow Jones Industrial Average', defaultStart: '1950-01-01' },
    nasdaq: { file: '/nasdaq_clean.csv', label: 'NASDAQ Composite',             defaultStart: '1971-02-05' },
};

function DjiHistoryPanel() {
    const [index, setIndex] = useState<IndexKey>('dji');
    const [allRowsByIndex, setAllRowsByIndex] = useState<Record<IndexKey, DjiRow[]>>({ dji: [], nasdaq: [] });
    const [cpiMap, setCpiMap] = useState<Map<string, number>>(new Map());
    const [startDate, setStartDate] = useState('1950-01-01');
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
    const [loading, setLoading] = useState(true);
    const [adjusted, setAdjusted] = useState(false);
    const [logScale, setLogScale] = useState(false);
    const chartRef = useRef<any>(null);
    const [overlayBars, setOverlayBars] = useState<Array<{ label: string; top: number; height: number; color: string; left: number }>>([]);
    const computeBarsRef = useRef<() => void>(() => {});

    const allRows = allRowsByIndex[index];

    const parseIndexCsv = (text: string): DjiRow[] => {
        const rows: DjiRow[] = [];
        for (const line of text.trim().split('\n').slice(1)) {
            const [date, close] = line.split(',');
            const v = parseFloat(close);
            if (date && !isNaN(v)) rows.push({ date: date.trim(), close: v });
        }
        return rows;
    };

    useEffect(() => {
        Promise.all([
            fetch('/dji_full.csv').then(r => r.text()),
            fetch('/nasdaq_clean.csv').then(r => r.text()),
            fetch('/cpi_full.csv').then(r => r.text()),
        ]).then(([djiText, nasdaqText, cpiText]) => {
            const cpi = new Map<string, number>();
            for (const line of cpiText.trim().split('\n').slice(1)) {
                const [date, val] = line.split(',');
                const v = parseFloat(val);
                if (date && !isNaN(v)) cpi.set(date.trim().slice(0, 7), v);
            }
            setAllRowsByIndex({ dji: parseIndexCsv(djiText), nasdaq: parseIndexCsv(nasdaqText) });
            setCpiMap(cpi);
            setLoading(false);
        });
    }, []);

    // Latest CPI value — used as the base to express adjusted values in today's dollars
    const latestCpi = useMemo(() => {
        let max = 0;
        cpiMap.forEach(v => { if (v > max) max = v; });
        return max || 1;
    }, [cpiMap]);

    // All daily points in range with CPI adjustment applied
    const adjustedRows = useMemo(() => {
        const filtered = allRows.filter(r => r.date >= startDate && r.date <= endDate);
        return filtered.map(r => {
            if (!adjusted) return { date: r.date, value: r.close };
            const cpi = cpiMap.get(r.date.slice(0, 7));
            const value = cpi ? Math.round((r.close / cpi) * latestCpi * 100) / 100 : r.close;
            return { date: r.date, value };
        });
    }, [allRows, cpiMap, startDate, endDate, adjusted, latestCpi]);

    // Aggregated version for the chart, capped at 2000 points
    const displayPoints = useMemo(() => {
        const daysDiff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000;
        let pts = adjustedRows;
        if (daysDiff > 365 * 5) {
            const raw = adjustedRows.map(r => ({ date: r.date, close: r.value }));
            const agg = daysDiff > 365 * 20 ? aggregateYearly(raw) : aggregateMonthly(raw);
            pts = agg.map(r => ({ date: r.date, value: r.close }));
        }
        if (pts.length <= 500) return pts;
        return Array.from({ length: 500 }, (_, i) => pts[Math.round(i * (pts.length - 1) / 499)]);
    }, [adjustedRows, startDate, endDate]);

    const chartData = useMemo(() => ({
        labels: displayPoints.map(r => r.date),
        datasets: [{
            label: adjusted ? 'DJIA (Inflation Adjusted)' : 'DJIA',
            data: displayPoints.map(r => r.value),
            borderColor: adjusted ? '#6a9ac4' : '#f59e0b',
            backgroundColor: adjusted ? 'rgba(106,154,196,0.08)' : 'rgba(245,158,11,0.08)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: true,
            tension: 0.2,
        }],
    } as ChartData<'line'>), [displayPoints, adjusted]);

    // Table samples from raw daily data, not the chart aggregation
    const tablePoints = useMemo(() => {
        const n = adjustedRows.length;
        if (n <= 500) return adjustedRows;
        return Array.from({ length: 500 }, (_, i) => adjustedRows[Math.round(i * (n - 1) / 499)]);
    }, [adjustedRows]);

    // Always inflation-adjusted full dataset for the doubling table
    const realAdjustedRows = useMemo(() => {
        if (allRows.length === 0 || cpiMap.size === 0) return [];
        return allRows.map(r => {
            const cpi = cpiMap.get(r.date.slice(0, 7));
            const value = cpi ? (r.close / cpi) * latestCpi : r.close;
            return { date: r.date, value };
        });
    }, [allRows, cpiMap, latestCpi]);

    const doublingTable = useMemo(() => {
        if (realAdjustedRows.length === 0) return [];
        type Row = { startDate: string; endDate: string; startVal: number; endVal: number; days: number; apr: number; tag: string };
        const makeRow = (start: { date: string; value: number }, end: { date: string; value: number }, tag: string): Row => {
            const days = Math.round((new Date(end.date).getTime() - new Date(start.date).getTime()) / 86400000);
            const apr = Math.pow(2, 365 / days) - 1;
            return { startDate: start.date, endDate: end.date, startVal: start.value, endVal: end.value, days, apr, tag };
        };

        const rows: Row[] = [];

        // Forward doublings: earliest → latest
        let i = 0;
        while (i < realAdjustedRows.length) {
            const start = realAdjustedRows[i];
            let j = i + 1;
            while (j < realAdjustedRows.length && realAdjustedRows[j].value < start.value * 2) j++;
            if (j >= realAdjustedRows.length) break;
            rows.push(makeRow(start, realAdjustedRows[j], 'Forward'));
            i = j;
        }

        // Backward halvings: most recent → earliest
        let k = realAdjustedRows.length - 1;
        while (k > 0) {
            const end = realAdjustedRows[k];
            let j = k - 1;
            while (j >= 0 && realAdjustedRows[j].value > end.value / 2) j--;
            if (j < 0) break;
            rows.push(makeRow(realAdjustedRows[j], end, 'Backward'));
            k = j;
        }

        // Shortest and longest doubling — search monthly samples for performance
        const monthly: typeof realAdjustedRows = [];
        let lastMonth = '';
        for (const r of realAdjustedRows) {
            const m = r.date.slice(0, 7);
            if (m !== lastMonth) { monthly.push(r); lastMonth = m; }
        }
        let shortRow: Row | null = null;
        let longRow: Row | null = null;
        for (let a = 0; a < monthly.length; a++) {
            for (let b = a + 1; b < monthly.length; b++) {
                if (monthly[b].value >= monthly[a].value * 2) {
                    const r = makeRow(monthly[a], monthly[b], '');
                    if (!shortRow || r.days < shortRow.days) shortRow = { ...r, tag: 'Shortest' };
                    if (!longRow  || r.days > longRow.days)  longRow  = { ...r, tag: 'Longest'  };
                    break; // only first doubling from each start point
                }
            }
        }
        if (shortRow) rows.push(shortRow);
        if (longRow)  rows.push(longRow);

        // Sort all rows by start date
        rows.sort((a, b) => a.startDate.localeCompare(b.startDate));
        return rows;
    }, [realAdjustedRows]);

    // Keep computeBarsRef current so animation.onComplete can call it without stale closures
    computeBarsRef.current = useCallback(() => {
        const chart = chartRef.current;
        if (!chart || !logScale || displayPoints.length === 0) { setOverlayBars([]); return; }
        const maxVal = Math.max(...displayPoints.map(p => p.value));
        const chartTop = chart.chartArea?.top ?? 0;
        const chartLeft = chart.chartArea?.left ?? 0;
        const percs = [{ pct: 0.5, label: '50%', color: '#fde68a' }, { pct: 0.25, label: '25%', color: '#bfdbfe' }, { pct: 0.10, label: '10%', color: '#bbf7d0' }];
        setOverlayBars(percs.map((p, i) => {
            const targetVal = maxVal * (1 - p.pct);
            const bottomPx = chart.scales?.y?.getPixelForValue(targetVal) ?? chartTop;
            return { label: p.label, top: chartTop, height: Math.max(0, bottomPx - chartTop), color: p.color, left: chartLeft + i * 110 };
        }));
    }, [logScale, displayPoints]);

    useEffect(() => {
        if (!logScale) { setOverlayBars([]); return; }
        // Defer until after React has painted the chart
        const frame = requestAnimationFrame(() => computeBarsRef.current());
        return () => cancelAnimationFrame(frame);
    }, [logScale, displayPoints]);

    const options: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: { display: false },
            title: {
                display: true,
                text: adjusted ? `${INDEX_META[index].label} (Inflation Adjusted, Today's Dollars)` : INDEX_META[index].label,
                font: { family: 'Rajdhani,sans-serif', size: 15, weight: 'bold' },
                color: '#001830',
                padding: { bottom: 12 },
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: ctx => `${ctx.parsed.y.toLocaleString()}`,
                },
            },
        },
        scales: {
            x: { ticks: { maxTicksLimit: 12, font: { family: 'Share Tech Mono,monospace', size: 11 } } },
            y: { type: logScale ? 'logarithmic' : 'linear', ticks: { font: { family: 'Share Tech Mono,monospace', size: 11 }, callback: v => Number(v).toLocaleString() } },
        },
    };

    const inputStyle: React.CSSProperties = {
        fontFamily: 'Share Tech Mono,monospace',
        fontSize: '0.85rem',
        border: '1.5px solid #dde6f0',
        borderRadius: 4,
        padding: '0.25rem 0.5rem',
        color: '#001830',
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {/* Index selector */}
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {(Object.keys(INDEX_META) as IndexKey[]).map(k => (
                        <button key={k} style={{
                            ...pillBtnStyle,
                            background: index === k ? '#001830' : 'transparent',
                            color: index === k ? '#f59e0b' : '#001830',
                            border: `1.5px solid ${index === k ? '#001830' : '#001830'}`,
                        }} onClick={() => {
                            setIndex(k);
                            setStartDate(INDEX_META[k].defaultStart);
                        }}>
                            {k === 'dji' ? 'Dow Jones' : 'NASDAQ'}
                        </button>
                    ))}
                </div>
                <label style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 600, color: '#6a9ac4', fontSize: '0.85rem' }}>
                    From
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        style={{ ...inputStyle, marginLeft: '0.5rem' }} />
                </label>
                <label style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 600, color: '#6a9ac4', fontSize: '0.85rem' }}>
                    To
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                        style={{ ...inputStyle, marginLeft: '0.5rem' }} />
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[['1Y', 1], ['5Y', 5], ['10Y', 10], ['25Y', 25], ['All', 0]].map(([label, years]) => (
                        <button key={label} style={{ ...pillBtnStyle, background: 'transparent', color: '#001830' }}
                            onClick={() => {
                                const end = new Date().toISOString().slice(0, 10);
                                setEndDate(end);
                                if (years === 0) { setStartDate('1885-02-16'); }
                                else {
                                    const d = new Date();
                                    d.setFullYear(d.getFullYear() - Number(years));
                                    setStartDate(d.toISOString().slice(0, 10));
                                }
                            }}
                        >{label}</button>
                    ))}
                </div>
                <button
                    style={{
                        ...pillBtnStyle,
                        background: adjusted ? '#6a9ac4' : 'transparent',
                        color: adjusted ? '#fff' : '#001830',
                        border: `1.5px solid ${adjusted ? '#6a9ac4' : '#001830'}`,
                    }}
                    onClick={() => setAdjusted(a => !a)}
                >
                    Inflation Adjusted
                </button>
                <button
                    style={{
                        ...pillBtnStyle,
                        background: logScale ? '#6a9ac4' : 'transparent',
                        color: logScale ? '#fff' : '#001830',
                        border: `1.5px solid ${logScale ? '#6a9ac4' : '#001830'}`,
                    }}
                    onClick={() => setLogScale(s => !s)}
                >
                    Log Scale
                </button>
            </div>
            {loading
                ? <p style={{ fontFamily: 'Rajdhani,sans-serif', color: '#6a9ac4' }}>Loading…</p>
                : <>
                    <div style={{ position: 'relative', height: 480 }}>
                        <Line ref={chartRef} data={chartData} options={options} />
                        {logScale && overlayBars.map((bar, i) => (
                            <div key={i} style={{
                                position: 'absolute',
                                left: bar.left,
                                top: bar.top,
                                width: 95,
                                height: bar.height,
                                background: bar.color,
                                opacity: 0.75,
                                borderRadius: '0 0 4px 0',
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'center',
                                paddingBottom: 4,
                                fontFamily: 'Rajdhani,sans-serif',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                color: '#001830',
                                pointerEvents: 'none',
                            }}>
                                {bar.label}
                            </div>
                        ))}
                    </div>
                    {(() => {
                        const yearBg = ['#fde68a','#bfdbfe','#bbf7d0','#e9d5ff','#c7d2fe'];

                        // Group points by year, preserving global index for prev-value comparison
                        const byYear = new Map<number, { pt: typeof tablePoints[0]; idx: number }[]>();
                        tablePoints.forEach((pt, idx) => {
                            const yr = parseInt(pt.date.slice(0, 4));
                            if (!byYear.has(yr)) byYear.set(yr, []);
                            byYear.get(yr)!.push({ pt, idx });
                        });

                        const yearList = Array.from(byYear.keys()).sort((a, b) => a - b);

                        // Use max points in any year so the busiest year always fits cleanly
                        const counts = yearList.map(yr => byYear.get(yr)!.length);
                        const ppy = Math.max(...counts);

                        // For each candidate cols (8–10):
                        //   - if cols is a multiple of ppy, pack floor(cols/ppy) years per row
                        //   - otherwise one year per row; minimise wasted cells in last row of each year
                        const best = [8, 9, 10].reduce((bestC, c) => {
                            const ypr = (ppy <= c && c % ppy === 0) ? Math.floor(c / ppy) : 1;
                            const cpY = ypr > 1 ? ppy : c;
                            const waste = Array.from(byYear.values())
                                .reduce((sum, pts) => sum + (pts.length % cpY === 0 ? 0 : cpY - (pts.length % cpY)), 0);
                            const bYpr = (ppy <= bestC && bestC % ppy === 0) ? Math.floor(bestC / ppy) : 1;
                            const bCpY = bYpr > 1 ? ppy : bestC;
                            const bestWaste = Array.from(byYear.values())
                                .reduce((sum, pts) => sum + (pts.length % bCpY === 0 ? 0 : bCpY - (pts.length % bCpY)), 0);
                            return waste < bestWaste ? c : bestC;
                        }, 10);

                        const yearsPerRow = (ppy <= best && best % ppy === 0) ? Math.floor(best / ppy) : 1;
                        const colsPerYear = yearsPerRow > 1 ? ppy : best;

                        const rows: React.ReactNode[] = [];

                        if (yearsPerRow > 1) {
                            // Multiple years side-by-side in each table row
                            for (let g = 0; g < yearList.length; g += yearsPerRow) {
                                const group = yearList.slice(g, g + yearsPerRow);
                                const maxR = Math.max(...group.map(yr => Math.ceil(byYear.get(yr)!.length / colsPerYear)));
                                for (let r = 0; r < maxR; r++) {
                                    const cells: React.ReactNode[] = [];
                                    group.forEach(yr => {
                                        const bg = yearBg[yr % 5];
                                        const entries = byYear.get(yr)!;
                                        for (let c = 0; c < colsPerYear; c++) {
                                            const entry = entries[r * colsPerYear + c];
                                            if (!entry) {
                                                cells.push(<td key={`${yr}-${r}-${c}`} style={{ border: '1px solid #d0d8e4', background: bg }} />);
                                            } else {
                                                const prev = entry.idx > 0 ? tablePoints[entry.idx - 1].value : entry.pt.value;
                                                const valueColor = entry.pt.value >= prev ? '#166534' : '#dc2626';
                                                cells.push(
                                                    <td key={`${yr}-${r}-${c}`} style={{ padding: '3px 6px', border: '1px solid #d0d8e4', whiteSpace: 'nowrap', background: bg }}>
                                                        <div style={{ color: '#6a9ac4', fontSize: '0.68rem' }}>{entry.pt.date}</div>
                                                        <div style={{ color: valueColor }}>{Math.round(entry.pt.value).toLocaleString()}</div>
                                                    </td>
                                                );
                                            }
                                        }
                                    });
                                    // Pad last group if fewer than yearsPerRow years remain
                                    const missing = yearsPerRow - group.length;
                                    for (let p = 0; p < missing * colsPerYear; p++) {
                                        cells.push(<td key={`pad-${p}`} style={{ border: '1px solid #d0d8e4' }} />);
                                    }
                                    rows.push(<tr key={`g${g}-r${r}`}>{cells}</tr>);
                                }
                            }
                        } else {
                            // One year per row-group
                            yearList.forEach(yr => {
                                const bg = yearBg[yr % 5];
                                const entries = byYear.get(yr)!;
                                const numRows = Math.ceil(entries.length / best);
                                for (let r = 0; r < numRows; r++) {
                                    const cells: React.ReactNode[] = [];
                                    for (let c = 0; c < best; c++) {
                                        const entry = entries[r * best + c];
                                        if (!entry) {
                                            cells.push(<td key={c} style={{ border: '1px solid #d0d8e4', background: bg }} />);
                                        } else {
                                            const prev = entry.idx > 0 ? tablePoints[entry.idx - 1].value : entry.pt.value;
                                            const valueColor = entry.pt.value >= prev ? '#166534' : '#dc2626';
                                            cells.push(
                                                <td key={c} style={{ padding: '3px 6px', border: '1px solid #d0d8e4', whiteSpace: 'nowrap', background: bg }}>
                                                    <div style={{ color: '#6a9ac4', fontSize: '0.68rem' }}>{entry.pt.date}</div>
                                                    <div style={{ color: valueColor }}>{Math.round(entry.pt.value).toLocaleString()}</div>
                                                </td>
                                            );
                                        }
                                    }
                                    rows.push(<tr key={`${yr}-${r}`}>{cells}</tr>);
                                }
                            });
                        }

                        return (
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1.5rem', fontFamily: 'Share Tech Mono,monospace', fontSize: '0.75rem' }}>
                                <tbody>{rows}</tbody>
                            </table>
                        );
                    })()}

                    {/* Real Doubling Table */}
                    <div style={{ marginTop: '2.5rem' }}>
                        <div style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#001830', marginBottom: '0.75rem' }}>
                            Real Doubling <span style={{ fontWeight: 400, fontSize: '0.8rem', color: '#6a9ac4', letterSpacing: 0, textTransform: 'none' }}>(inflation adjusted, today's dollars)</span>
                        </div>
                        <table style={{ borderCollapse: 'collapse', fontFamily: 'Share Tech Mono,monospace', fontSize: '0.78rem' }}>
                            <thead>
                                <tr style={{ background: '#001830', color: '#f59e0b' }}>
                                    {['#', 'Type', 'Start Date', 'Start Value', 'End Date', 'End Value', 'Days', 'Years', 'Implied APR'].map(h => (
                                        <th key={h} style={{ padding: '5px 10px', border: '1px solid #334155', textAlign: 'left', fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, letterSpacing: '0.08em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {doublingTable.map((row, i) => {
                                    const isSpecial = row.tag === 'Shortest' || row.tag === 'Longest';
                                    const bg = isSpecial
                                        ? (row.tag === 'Shortest' ? '#86efac' : '#fca5a5')
                                        : ['#fde68a','#bfdbfe','#bbf7d0','#e9d5ff','#c7d2fe'][i % 5];
                                    const tagColor = row.tag === 'Forward' ? '#6a9ac4' : row.tag === 'Backward' ? '#a855f7' : row.tag === 'Shortest' ? '#166534' : '#991b1b';
                                    return (
                                        <tr key={i} style={{ background: bg }}>
                                            <td style={{ padding: '4px 10px', border: '1px solid #d0d8e4', color: '#6a9ac4' }}>{i + 1}</td>
                                            <td style={{ padding: '4px 10px', border: '1px solid #d0d8e4', color: tagColor, fontWeight: 700 }}>{row.tag}</td>
                                            <td style={{ padding: '4px 10px', border: '1px solid #d0d8e4' }}>{row.startDate}</td>
                                            <td style={{ padding: '4px 10px', border: '1px solid #d0d8e4' }}>{Math.round(row.startVal).toLocaleString()}</td>
                                            <td style={{ padding: '4px 10px', border: '1px solid #d0d8e4' }}>{row.endDate}</td>
                                            <td style={{ padding: '4px 10px', border: '1px solid #d0d8e4' }}>{Math.round(row.endVal).toLocaleString()}</td>
                                            <td style={{ padding: '4px 10px', border: '1px solid #d0d8e4' }}>{row.days.toLocaleString()}</td>
                                            <td style={{ padding: '4px 10px', border: '1px solid #d0d8e4' }}>{(row.days / 365).toFixed(1)}</td>
                                            <td style={{ padding: '4px 10px', border: '1px solid #d0d8e4', color: '#166534', fontWeight: 700 }}>{(row.apr * 100).toFixed(1)}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            }
        </div>
    );
}

export default Futures;
