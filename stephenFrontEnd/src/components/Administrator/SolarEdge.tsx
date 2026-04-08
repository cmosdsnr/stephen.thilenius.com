/**
 * @fileoverview SolarEdge inverter monitoring component for solar power generation tracking.
 * Provides real-time visualization of solar power output with historical data analysis,
 * interactive charts, and SunSpec device information display. Features date range selection
 * and WebSocket integration for live updates.
 */

import React, { useState, useEffect } from 'react'
import { useQuery } from 'react-query';
import { Row, Col, Spinner, Alert } from 'react-bootstrap'
import { useWss } from '../../contexts/WssContext';
import { API } from '../../api';
import { AdminMenu } from './AdminMenu';
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
     * Range params state drives the range query key so React Query re-fetches
     * whenever the user selects a different date range.
     */
    const [rangeParams, setRangeParams] = useState<{ from: Date; to: Date }>(() => {
        const now = new Date();
        return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0, 0), to: now };
    });

    /** WebSocket context for live solar data updates */
    const { solarEdgeUpdate, subscribe, unsubscribe, isReady } = useWss();

    /**
     * React Query hook to fetch solar power data for the selected date range.
     * Re-fetches automatically when rangeParams changes.
     */
    const { data: rangeResult, isLoading: rangeLoading, error: rangeError } = useQuery(
        ['solarEdgeRange', rangeParams.from.toISOString(), rangeParams.to.toISOString()],
        async () => {
            console.log("loadRange", rangeParams.from, "to", rangeParams.to);
            const response = await fetch(API.solarEdgeRange(rangeParams.from, rangeParams.to));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const res = await response.json();
            console.log(res);
            console.log("received", res.data.length / 240.0, "hours of data");
            let start = 3600000 * res.fromHour;
            const data: SolarPoint[] = [];
            res.data.forEach((dp: any) => {
                data.push({ timestamp: start, power: dp / 1000 });
                start += 15000;
            });
            const f = new Date(start);
            const t = new Date(start + 15000 * res.data.length);
            const days = Math.floor((t.getTime() - f.getTime()) / (24 * 3600 * 1000));
            const hrs = Math.floor((t.getTime() - f.getTime()) / (3600 * 1000)) - 24 * days;
            return { solarEdgeData: data, range: { from: rangeParams.from, to: rangeParams.to, days, hrs } };
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
     * Helper to trigger a new range fetch by updating rangeParams state.
     */
    const loadRange = (from: Date, to: Date) => {
        setRangeParams({ from, to });
        setRange(prev => ({ ...prev, from, to }));
    };

    /**
     * Effect hook to handle WebSocket reconnection and data reload.
     * Automatically reloads current data when WebSocket reconnects to ensure data continuity.
     */
    useEffect(() => {
        // if we got disconnected and then reconnected, reload data
        if (isReady && solarEdgeData.length > 0) {
            localStorage.setItem('useStartDate', "false");
            setUseStartDate(false);
            const now = new Date();
            const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - numDays, 0, 0, 0, 0);
            setSelectedDate(from);
            loadRange(from, now);
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            console.log(timeZone);
            console.log((new Date(now.getFullYear(), now.getMonth(), now.getDate() - numDays, now.getHours(), 0, 0, 0)).toLocaleString());
            console.log(localStorage.getItem('useStartDate'));
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

    /** Live data points appended by WebSocket updates since the last range load */
    const [livePoints, setLivePoints] = useState<SolarPoint[]>([]);

    /**
     * Effect hook to handle real-time solar data updates via WebSocket.
     * Appends new data points to the live buffer when not ignoring updates.
     */
    useEffect(() => {
        if (!ignoreUpdates && solarEdgeUpdate) {
            // console.log("solarEdgeUpdate:", solarEdgeUpdate);
            setLivePoints(prev => [...prev, { timestamp: 1000 * solarEdgeUpdate[1], power: solarEdgeUpdate[0] / 1000 }]);
            setLastSolarEdgeUpdate(new Date());
        }
    }, [solarEdgeUpdate]);

    /** Reset live points whenever a new range is fetched */
    useEffect(() => {
        setLivePoints([]);
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
        loadRange(from, now);
    };

    /** Merged data: historical from query + live WebSocket points */
    const displayData: SolarPoint[] = [...solarEdgeData, ...livePoints];

    /** Chart.js data configuration for solar power visualization */
    const chartData = {
        labels: displayData.map(dp => new Date(dp.timestamp)),
        datasets: [
            {
                label: 'Speed',
                data: displayData.map(dp => dp.power),
                borderColor: chartTeal.solid,
                backgroundColor: chartTeal.fill,
                fill: false,
                pointRadius: 0, // Hide point markers
            },
        ],
    };

    /** Chart.js options configuration with zoom/pan capabilities and styling */
    const options = {
        responsive: true,
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
                display: true,               // <-- turn on the title
                text: 'SolarEdge Power (W)', // <-- your chart title
                position: 'top',             // 'top' is default, but you can choose 'bottom'
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
    };

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
            loadRange(selectedDate!, futureDate);
        } else
            loadRange(new Date(now.getFullYear(), now.getMonth(), now.getDate() - v, 0, 0, 0, 0), now);
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
            loadRange(date, futureDate);
        }
    };

    if (rangeLoading)
        return <div><AdminMenu span={4} offset={8} /><Spinner animation="border" role="status"><span className="visually-hidden">Loading...</span></Spinner></div>;
    if (rangeError)
        return <div><AdminMenu span={4} offset={8} /><Alert variant="danger">Error: {(rangeError as Error).message}</Alert></div>;
    {
        return (
            <div>
                <AdminMenu span={4} offset={8} />
                <h1>SolarEdge</h1>
                <p className="text-center">last Update: {lastSolarEdgeUpdate.toLocaleString()}</p>

                <Row className="border border-black mb-[10px] bg-white p-5">
                    <Line data={chartData} options={options as any} />
                </Row>
                <Row className="border border-black mb-[10px]">
                    <Col xs={3} className="m-[15px]">Number of Days (1-10) : {numDays} </Col>
                    <Col xs={7} className="bg-white p-5 pl-10 pb-[30px]">
                        <Slider
                            min={1}
                            max={10}
                            marks={marks}
                            value={numDays}
                            onChange={(v) => handleChangeDays(v as number)}
                        />
                    </Col>
                </Row>
                <Row className="border border-black mb-[10px]">
                    <Col xs={2}>
                        <input type="checkbox" checked={useStartDate} onChange={(e) => handleUseStartDate(e)} /> Use startDate
                    </Col>
                    <Col xs={2}>
                        {useStartDate && <DatePicker
                            selected={selectedDate}
                            onChange={handleDateChange}
                            dateFormat="yyyy/MM/dd"
                            maxDate={new Date()}
                            isClearable
                        />}
                    </Col>
                    <Col xs={7}>
                        <p>Selected range: {range.from.toLocaleString()} to {range.to.toLocaleString()} ( {range.days} days, {range.hrs} hrs) </p>
                    </Col>
                </Row>
                <Row className="border border-black mb-[100px]">
                    <Col xs={12}>
                        {info && (
                            <div>
                                <h3>Unit Info</h3>
                                <table className="border-collapse w-[300px] bg-white p-5">
                                    <tbody>
                                        <tr className="border border-black">
                                            <td className="font-bold">Signature</td>
                                            <td>{info.signature}</td>
                                        </tr>
                                        <tr className="border border-black">
                                            <td className="font-bold">Model ID</td>
                                            <td>{info.modelId}</td>
                                        </tr>
                                        <tr className="border border-black">
                                            <td className="font-bold">Block Length</td>
                                            <td>{info.blockLength}</td>
                                        </tr>
                                        <tr className="border border-black">
                                            <td className="font-bold">Manufacturer</td>
                                            <td>{info.manufacturer}</td>
                                        </tr>
                                        <tr className="border border-black">
                                            <td className="font-bold">Model</td>
                                            <td>{info.model}</td>
                                        </tr>
                                        <tr className="border border-black">
                                            <td className="font-bold">Version</td>
                                            <td>{info.version}</td>
                                        </tr>
                                        <tr className="border border-black">
                                            <td className="font-bold">Serial</td>
                                            <td>{info.serial}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Col>
                </Row>
            </div >
        );
    }
}
