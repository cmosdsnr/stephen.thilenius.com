/**
 * @fileoverview SolarEdge inverter monitoring component for solar power generation tracking.
 * Provides real-time visualization of solar power output with historical data analysis,
 * interactive charts, and SunSpec device information display. Features date range selection
 * and WebSocket integration for live updates.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from 'react-query';
import { Row, Col, Spinner, Alert } from 'react-bootstrap'
import { useWss } from '../../contexts/WssContext';
import { API } from '../../api';
import AdminPageLayout from './AdminPageLayout';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import './admin.css';
import _ from 'lodash';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';
import { preventOverflow } from '@popperjs/core';
import { chartTeal } from '../../tokens';

/**
 * Represents SunSpec common model information from the solar inverter.
 * Contains device identification and communication details.
 */
interface SunSpecCommonInfo {
    /** SunSpec signature identifier */
    signature: string;
    /** Model identifier number */
    modelId: number;
    /** Data block length in registers */
    blockLength: number;
    /** Device manufacturer name */
    manufacturer: string;
    /** Device model designation */
    model: string;
    /** Firmware/software version */
    version: string;
    /** Device serial number */
    serial: string;
}

/**
 * Represents a solar power data point with timestamp and power measurement.
 * Used for time-series visualization and historical analysis.
 */
interface SolarPoint {
    /** Unix timestamp in milliseconds */
    timestamp: number;
    /** Power output in kilowatts */
    power: number;
}

/**
 * Represents a date range with calculated duration information.
 * Used for displaying selected time ranges and data coverage.
 */
interface DateRange {
    /** Start date of the range */
    from: Date;
    /** End date of the range */
    to: Date;
    /** Number of complete days in the range */
    days: number;
    /** Additional hours beyond complete days */
    hrs: number;
}

// Register Chart.js components and the zoom plugin
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    zoomPlugin
);


const fmtDate = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getMonth()+1}/${d.getDate()}/${String(d.getFullYear()).slice(2)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

/** Slider marks for day selection (1-10 days) */
const marks = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10' }

/**
 * SolarEdge monitoring component for real-time and historical solar power analysis.
 * Provides interactive visualization of solar power generation with date range selection,
 * live WebSocket updates, and comprehensive device information display.
 * 
 * @component
 * @returns {JSX.Element} Complete SolarEdge monitoring interface
 * 
 * @example
 * ```tsx
 * // Usage in routing for administrator access
 * <Route path="/admin/solar" component={SolarEdge} />
 * 
 * // Direct component usage
 * <SolarEdge />
 * ```
 * 
 * @description
 * The SolarEdge component provides:
 * - Real-time solar power monitoring with WebSocket updates
 * - Historical data visualization with configurable date ranges (1-10 days)
 * - Interactive Chart.js charts with zoom and pan capabilities
 * - Custom date range selection with start date picker
 * - SunSpec device information display
 * - Automatic reconnection handling with data reload
 * - LocalStorage persistence for user preferences
 * - Power conversion from watts to kilowatts for display
 * 
 * @remarks
 * - Automatically subscribes to "solar" WebSocket topic for live updates
 * - Persists user preferences (number of days, start date usage) in localStorage
 * - Handles timezone detection and display
 * - Updates ignore mechanism prevents data pollution during historical viewing
 * - Data points are sampled every 15 seconds from the SolarEdge inverter
 * - Supports both relative (last N days) and absolute (from specific date) ranges
 */
export default function SolarEdge() {
    /** Timestamp of the most recent data update */
    const [lastSolarEdgeUpdate, setLastSolarEdgeUpdate] = useState<Date>(new Date());

    /** Current selected date range with calculated duration */
    const [range, setRange] = useState<DateRange>({ from: new Date(), to: new Date(), days: 0, hrs: 0 });

    /** Number of days to display (1-10), persisted in localStorage */
    const [numDays, setNumDays] = useState<number>(
        localStorage.getItem('numSolarDays') ?
            JSON.parse(localStorage.getItem('numSolarDays') as string) as number : 1
    );

    /** Selected start date for custom date range mode */
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    /** Flag to ignore live updates when viewing historical data */
    const [ignoreUpdates, setIgnoreUpdates] = useState<boolean>(false);

    /** Whether to use custom start date mode, persisted in localStorage */
    const [useStartDate, setUseStartDate] = useState<boolean>(localStorage.getItem('useStartDate') == "true");

    /**
     * Start date of the currently displayed range. Changing this triggers a React Query re-fetch.
     * The end date is always the current time — the backend defaults `to` to now when omitted.
     */
    const [rangeParams, setRangeParams] = useState<{ from: Date }>(() => {
        const now = new Date();
        return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0, 0) };
    });

    /** WebSocket context for live solar data updates */
    const { solarEdgeUpdate, subscribe, unsubscribe, isReady } = useWss();

    /** Ref to Chart.js instance for imperative updates that preserve zoom */
    const chartRef = useRef<any>(null);

    /** Tracks whether the WebSocket has ever gone offline (to distinguish reconnect from first connect) */
    const wasDisconnected = useRef(false);

    /**
     * React Query hook to fetch solar power data from `rangeParams.from` to now.
     * The backend decimates the result to `chartWidth` points (one per display pixel).
     * Re-fetches automatically when `rangeParams` changes.
     * Response `stepMs` is used to compute per-point timestamps from `fromHour`.
     */
    const { data: rangeResult, isLoading: rangeLoading, error: rangeError } = useQuery(
        ['solarEdgeRange', rangeParams.from.toISOString()],
        async () => {
            const points = chartRef.current?.width ?? 1000;
            const response = await fetch(API.solarEdgeRange(rangeParams.from, points));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const res = await response.json();
            console.log(`received ${res.data.length} points, stepMs=${res.stepMs}`);
            let start = 3600000 * res.fromHour;
            const data: SolarPoint[] = [];
            res.data.forEach((dp: number) => {
                data.push({ timestamp: start, power: dp / 1000 });
                start += res.stepMs;
            });
            const totalMs = res.stepMs * res.data.length;
            const days = Math.floor(totalMs / (24 * 3600 * 1000));
            const hrs = Math.floor(totalMs / 3600000) - 24 * days;
            return { solarEdgeData: data, range: { from: rangeParams.from, to: new Date(start), days, hrs } };
        },
        {
            keepPreviousData: true,
            onSuccess: () => setLastSolarEdgeUpdate(new Date()),
        }
    );

    const solarEdgeData: SolarPoint[] = rangeResult?.solarEdgeData ?? [];

    /**
     * React Query hook to fetch SunSpec device information (once on mount).
     */
    const { data: info } = useQuery<SunSpecCommonInfo>(
        ['solarEdgeUnitInfo'],
        async () => {
            const response = await fetch(API.solarEdgeUnitInfo());
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json() as Promise<SunSpecCommonInfo>;
        }
    );

    /**
     * Triggers a new range fetch from `from` to the current end of the database.
     * Updates both the React Query key (causing a re-fetch) and the display range state.
     *
     * @param from - Start of the new range
     */
    const loadRange = (from: Date) => {
        setRangeParams({ from });
        setRange(prev => ({ ...prev, from }));
    };

    /**
     * Effect hook to handle WebSocket reconnection and data reload.
     * Automatically reloads current data when WebSocket reconnects to ensure data continuity.
     */
    useEffect(() => {
        if (!isReady) {
            wasDisconnected.current = true;
        } else if (wasDisconnected.current && solarEdgeData.length > 0) {
            wasDisconnected.current = false;
            localStorage.setItem('useStartDate', "false");
            setUseStartDate(false);
            const now = new Date();
            const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - numDays, 0, 0, 0, 0);
            setSelectedDate(from);
            loadRange(from);
        }
    }, [isReady]);

    /**
     * Effect hook for component initialization.
     * Sets up initial data load and WebSocket subscription.
     */
    useEffect(() => {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0, 0);
        setSelectedDate(from);
        setNumDays(2);
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log(timeZone);
        console.log((new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - 36, 0, 0, 0)).toLocaleString());
        console.log(localStorage.getItem('useStartDate'));
        subscribe("solar");
        return () => {
            unsubscribe("solar");
        };
    }, []);

    /** Live data points accumulated since last range load — stored as a ref to avoid re-renders */
    const livePointsRef = useRef<SolarPoint[]>([]);

    /**
     * Effect hook to handle real-time solar data updates via WebSocket.
     * Updates the chart imperatively to preserve zoom state.
     */
    useEffect(() => {
        if (!ignoreUpdates && solarEdgeUpdate) {
            const newPoint = { timestamp: 1000 * solarEdgeUpdate[0], power: solarEdgeUpdate[1] / 1000 };
            livePointsRef.current.push(newPoint);
            setLastSolarEdgeUpdate(new Date());
            if (chartRef.current) {
                chartRef.current.data.datasets[0].data.push({ x: newPoint.timestamp, y: newPoint.power });
                chartRef.current.update('none');
            }
        }
    }, [solarEdgeUpdate]);

    /** Reset live points and zoom whenever a new range is fetched */
    useEffect(() => {
        livePointsRef.current = [];
        if (chartRef.current) {
            chartRef.current.resetZoom();
        }
    }, [rangeParams]);

    /**
     * Selects a relative date range based on number of days from current time.
     * Convenience method for loading recent historical data.
     * 
     * @param days - Number of days back from current time
     * 
     * @example
     * ```tsx
     * selectRange(7);
     * // Loads data for the last 7 days
     * ```
     */
    const selectRange = (days: number) => {
        const now = new Date();
        const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        loadRange(from);
    };

    /**
     * Stable empty chart structure — never mutated by React.
     * All data is loaded imperatively via chartRef to prevent react-chartjs-2
     * from calling chart.update() on re-renders and resetting zoom.
     */
    const chartData = useMemo(() => ({
        labels: [] as Date[],
        datasets: [{
            label: 'Speed',
            data: [] as { x: number; y: number }[],
            borderColor: chartTeal.solid,
            backgroundColor: chartTeal.fill,
            fill: false,
            pointRadius: 0,
        }],
    }), []);

    /** When historical data arrives (or chart mounts after load), replace chart data fully */
    useEffect(() => {
        if (!chartRef.current || solarEdgeData.length === 0) return;
        chartRef.current.data.labels = [];
        chartRef.current.data.datasets[0].data = solarEdgeData.map(dp => ({ x: dp.timestamp, y: dp.power }));
        chartRef.current.update();
    }, [solarEdgeData, rangeLoading]);

    /** Chart.js options configuration with zoom/pan capabilities and styling */
    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'time',
                time: { unit: 'hour' },
                title: {
                    display: true,
                    text: 'Time',
                    font: { size: 14, weight: 'bold' },
                    padding: { top: 10, bottom: 10 }
                }
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Power (kW)',
                    font: { size: 14, weight: 'bold' },
                    padding: { top: 10, bottom: 10 }
                }
            }
        },
        plugins: {
            title: {
                display: true,
                text: 'SolarEdge Power (W)',
                position: 'top',
                padding: { top: 10, bottom: 30 },
                font: { size: 18, weight: 'bold' }
            },
            legend: {
                display: false
            },
            zoom: {
                pan: {
                    enabled: true,
                    mode: 'x',
                },
                zoom: {
                    wheel: {
                        enabled: true,
                    },
                    pinch: {
                        enabled: true
                    },
                    mode: 'x',
                },
            },
        },
    }), []);

    /**
     * Handles changes to the number of days selector.
     * Updates the display range and persists the preference to localStorage.
     * Manages update ignore state for historical data viewing.
     * 
     * @param v - New number of days to display (1-10)
     * 
     * @example
     * ```tsx
     * handleChangeDays(5);
     * // Changes display to show 5 days of data
     * ```
     */
    const handleChangeDays = (v: number) => {
        setNumDays(v);
        localStorage.setItem('numSolarDays', v.toString());
        const now = new Date();

        if (useStartDate) {
            const start = selectedDate!;
            let futureDate = new Date(selectedDate!.getTime() + v * 24 * 60 * 60 * 1000);
            if (futureDate > now) {
                futureDate = now;
                setIgnoreUpdates((prev) => false);
            }
            if (futureDate < now) {
                console.log("ignoring updates");
                setIgnoreUpdates((prev) => true);
            }
            loadRange(selectedDate!);
        } else
            loadRange(new Date(now.getFullYear(), now.getMonth(), now.getDate() - v, 0, 0, 0, 0));
    };

    /**
     * Handles toggling of the custom start date mode.
     * Persists the preference to localStorage for future sessions.
     * 
     * @param e - Checkbox change event
     * 
     * @example
     * ```tsx
     * handleUseStartDate(event);
     * // Toggles between relative and absolute date range modes
     * ```
     */
    const handleUseStartDate = (e: any) => {
        setUseStartDate(e.target.checked);
        localStorage.setItem('useStartDate', e.target.checked ? "true" : "false");
    };

    /**
     * Handles changes to the custom start date picker.
     * Calculates appropriate end date and manages update ignore state.
     * 
     * @param date - Selected start date or null to clear
     * 
     * @example
     * ```tsx
     * handleDateChange(new Date('2024-01-15'));
     * // Sets custom start date for historical data viewing
     * ```
     */
    const handleDateChange = (date: Date | null) => {
        setSelectedDate(date);
        if (date) {
            const now = new Date();
            let futureDate = new Date(date.getTime() + numDays * 24 * 60 * 60 * 1000);
            if (futureDate > now) {
                futureDate = now;
                setIgnoreUpdates((prev) => false);
            }
            if (futureDate < now) {
                console.log("ignoring updates");
                setIgnoreUpdates((prev) => true);
            }
            loadRange(date);
        }
    };

    if (rangeError)
        return (
            <AdminPageLayout title="SolarEdge">
                <Alert variant="danger">Error: {(rangeError as Error).message}</Alert>
            </AdminPageLayout>
        );

    return (
        <AdminPageLayout title="SolarEdge">
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>

                {/* Chart card */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,24,48,0.07)', marginBottom: '1.5rem', overflow: 'hidden' }}>
                    <div style={{ background: '#001830', borderBottom: '2px solid #f59e0b', padding: '0.75rem 1.25rem' }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f59e0b' }}>
                            Power Output
                            {rangeLoading && <Spinner animation="border" size="sm" role="status" style={{ marginLeft: '0.75rem', verticalAlign: 'middle' }}><span className="visually-hidden">Loading...</span></Spinner>}
                        </span>
                    </div>
                    <div style={{ padding: '1.25rem', height: '400px' }}>
                        <Line ref={chartRef} data={chartData} options={options as any} />
                    </div>
                </div>

                {/* Controls card */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,24,48,0.07)', marginBottom: '1.5rem', overflow: 'hidden' }}>
                    <div style={{ background: '#001830', borderBottom: '2px solid #f59e0b', padding: '0.75rem 1.25rem' }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f59e0b' }}>
                            Time Range
                        </span>
                    </div>
                    <div style={{ padding: '1.25rem' }}>
                        <Row style={{ marginBottom: '1rem', alignItems: 'center' }}>
                            <Col xs={3} style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, color: '#001830' }}>
                                Days (1–10): {numDays}
                            </Col>
                            <Col xs={7} style={{ background: 'white', padding: '1rem 1.5rem 2rem' }}>
                                <Slider
                                    min={1}
                                    max={10}
                                    marks={marks}
                                    value={numDays}
                                    onChange={(v) => handleChangeDays(v as number)}
                                />
                            </Col>
                        </Row>
                        <Row style={{ alignItems: 'center', rowGap: '0.5rem' }}>
                            <Col xs={12} sm={3} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.85rem', color: '#001830' }}>
                                <label>
                                    <input type="checkbox" checked={useStartDate} onChange={(e) => handleUseStartDate(e)} style={{ marginRight: '0.4rem' }} />
                                    Use start date
                                </label>
                            </Col>
                            <Col xs={12} sm={3}>
                                {useStartDate && (
                                    <DatePicker
                                        selected={selectedDate}
                                        onChange={handleDateChange}
                                        dateFormat="yyyy/MM/dd"
                                        maxDate={new Date()}
                                        isClearable
                                    />
                                )}
                            </Col>
                            <Col xs={12} sm={6} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '0.72rem', color: '#6a9ac4' }}>
                                {range.from.toLocaleString()} → {range.to.toLocaleString()} ({range.days}d {range.hrs}h)
                            </Col>
                        </Row>
                    </div>
                </div>

                {/* Unit info card */}
                {info && (
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,24,48,0.07)', marginBottom: '1.5rem', overflow: 'hidden' }}>
                        <div style={{ background: '#001830', borderBottom: '2px solid #f59e0b', padding: '0.75rem 1.25rem' }}>
                            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f59e0b' }}>
                                Unit Info
                            </span>
                        </div>
                        <div style={{ padding: '1.25rem' }}>
                            <Row>
                                {([
                                    [['Manufacturer', info.manufacturer], ['Model', info.model]],
                                    [['Version', info.version], ['Serial', info.serial]],
                                    [['Model ID', String(info.modelId)], ['Signature', info.signature]],
                                    [['Block Length', String(info.blockLength)], ['Last Update', fmtDate(lastSolarEdgeUpdate)]],
                                ] as [string, string][][]).map((col, ci) => (
                                    <Col key={ci} xs={12} sm={3}>
                                        {col.map(([label, val]) => (
                                            <div key={label} style={{ marginBottom: '0.75rem' }}>
                                                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6a9ac4' }}>
                                                    {label}
                                                </div>
                                                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '0.82rem', color: '#001830' }}>
                                                    {val}
                                                </div>
                                            </div>
                                        ))}
                                    </Col>
                                ))}
                            </Row>
                        </div>
                    </div>
                )}

            </div>
        </AdminPageLayout>
    );
}
