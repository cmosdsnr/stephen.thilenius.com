/**
 * @fileoverview SolarEdge inverter monitoring component for solar power generation tracking.
 * Provides real-time visualization of solar power output with historical data analysis,
 * interactive charts, and SunSpec device information display. Features date range selection
 * and WebSocket integration for live updates.
 */

import React, { useState, useEffect } from 'react'
import { Row, Col } from 'react-bootstrap'
import { Chart, AxisOptions } from "react-charts";
import { useWss } from '../../contexts/WssContext';
import { useData } from '../../contexts/DataContext'
import { serverURL } from '../../constants';
import { AdminMenu } from './AdminMenu';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import './admin.css';
import _ from 'lodash';
import { AgCharts } from 'ag-charts-react'; // old charts
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
    /** Array of solar power data points for chart visualization */
    const [solarEdgeData, setSolarEdgeData] = useState<SolarPoint[]>([]);

    /** Timestamp of the most recent data update */
    const [lastSolarEdgeUpdate, setLastSolarEdgeUpdate] = useState<Date>(new Date());

    /** Current selected date range with calculated duration */
    const [range, setRange] = useState<DateRange>({ from: new Date(), to: new Date(), days: 0, hrs: 0 });

    /** SunSpec device information from the inverter */
    const [info, setInfo] = useState<SunSpecCommonInfo | null>(null);

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

    /** WebSocket context for live solar data updates */
    const { solarEdgeUpdate, subscribe, unsubscribe, isReady } = useWss();

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
     * Sets up initial data load, device info fetch, and WebSocket subscription.
     */
    useEffect(() => {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0, 0);
        setSelectedDate(from);
        loadRange(from, now);
        loadInfo();
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

    /**
     * Effect hook to handle real-time solar data updates via WebSocket.
     * Appends new data points to the existing dataset when not ignoring updates.
     */
    useEffect(() => {
        if (!ignoreUpdates && solarEdgeUpdate) {
            // console.log("solarEdgeUpdate:", solarEdgeUpdate);
            setSolarEdgeData(prevData => [...prevData, { timestamp: 1000 * solarEdgeUpdate[1], power: solarEdgeUpdate[0] / 1000 }]);
            setLastSolarEdgeUpdate(new Date());
        }
    }, [solarEdgeUpdate]);

    /**
     * Loads solar power data for a specified date range from the API.
     * Converts raw power values from watts to kilowatts and processes timestamps.
     * 
     * @param from - Start date for data range
     * @param to - End date for data range
     * 
     * @example
     * ```tsx
     * const now = new Date();
     * const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
     * loadRange(yesterday, now);
     * // Loads 24 hours of solar data
     * ```
     */
    const loadRange = (from: Date, to: Date) => {
        console.log("loadRange", from, "to", to);
        const url = new URL('/api/solarEdge/Range', serverURL);
        url.searchParams.set('from', from.toISOString());
        url.searchParams.set('to', to.toISOString());
        fetch(url.toString())
            .then(response => response.json())
            .then(res => {
                console.log(res);
                console.log("received", res.data.length / 240.0, "hours of data");
                let start = 3600000 * res.fromHour;
                let data: any[] = [];
                res.data.forEach((dp: any) => {
                    data.push({ timestamp: start, power: dp / 1000 });
                    start += 15000;
                });
                setSolarEdgeData(data);
                let f = new Date(start);
                let t = new Date(start + 15000 * res.data.length);
                const days = Math.floor((t.getTime() - f.getTime()) / (24 * 3600 * 1000));
                const hrs = Math.floor((t.getTime() - f.getTime()) / (3600 * 1000)) - 24 * days;
                setRange({ from, to, days, hrs });
                setLastSolarEdgeUpdate(new Date());
            });
    };

    /**
     * Loads SunSpec device information from the solar inverter.
     * Retrieves manufacturer, model, version, and other device details.
     * 
     * @example
     * ```tsx
     * loadInfo();
     * // Fetches and displays inverter device information
     * ```
     */
    const loadInfo = () => {
        const url = new URL('/api/solarEdge/UnitInfo', serverURL);
        fetch(url.toString())
            .then(response => response.json())
            .then(res => {
                setInfo(res);
            });
    };

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

    /** Chart.js data configuration for solar power visualization */
    const chartData = {
        labels: solarEdgeData.map(dp => new Date(dp.timestamp)),
        datasets: [
            {
                label: 'Speed',
                data: solarEdgeData.map(dp => dp.power),
                borderColor: 'rgba(75,192,192,1)',
                backgroundColor: 'rgba(75,192,192,0.2)',
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

    if (solarEdgeData.length === 0)
        return <div><AdminMenu span={4} offset={8} />Loading...</div>;
    else {
        return (
            <div>
                <AdminMenu span={4} offset={8} />
                <h1>SolarEdge</h1>
                <p style={{ textAlign: "center" }}>last Update: {lastSolarEdgeUpdate.toLocaleString()}</p>

                <Row style={{ border: "1px solid black", marginBottom: "10px", backgroundColor: 'white', padding: '20px' }}>
                    <Line data={chartData} options={options as any} />
                </Row>
                <Row style={{ border: "1px solid black", marginBottom: "10px" }}>
                    <Col xs={3} style={{ margin: '15px' }}>Number of Days (1-10) : {numDays} </Col>
                    <Col xs={7} style={{ backgroundColor: 'white', padding: '20px', paddingLeft: '40px', paddingBottom: '30px' }}>
                        <Slider
                            min={1}
                            max={10}
                            marks={marks}
                            value={numDays}
                            onChange={(v) => handleChangeDays(v as number)}
                        />
                    </Col>
                </Row>
                <Row style={{ border: "1px solid black", marginBottom: "10px" }}>
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
                <Row style={{ border: "1px solid black", marginBottom: "100px" }}>
                    <Col xs={12}>
                        {info && (
                            <div>
                                <h3>Unit Info</h3>
                                <table style={{ borderCollapse: 'collapse', width: '300px', backgroundColor: 'white', padding: '20px' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ fontWeight: 'bold' }}>Signature</td>
                                            <td style={{}}>{info.signature}</td>
                                        </tr>
                                        <tr style={{ border: '1px solid black' }}>
                                            <td style={{ fontWeight: 'bold' }}>Model ID</td>
                                            <td style={{}}>{info.modelId}</td>
                                        </tr>
                                        <tr style={{ border: '1px solid black' }}>
                                            <td style={{ fontWeight: 'bold' }}>Block Length</td>
                                            <td style={{}}>{info.blockLength}</td>
                                        </tr>
                                        <tr style={{ border: '1px solid black' }}>
                                            <td style={{ fontWeight: 'bold' }}>Manufacturer</td>
                                            <td style={{}}>{info.manufacturer}</td>
                                        </tr>
                                        <tr style={{ border: '1px solid black' }}>
                                            <td style={{ fontWeight: 'bold' }}>Model</td>
                                            <td style={{}}>{info.model}</td>
                                        </tr>
                                        <tr style={{ border: '1px solid black' }}>
                                            <td style={{ fontWeight: 'bold' }}>Version</td>
                                            <td style={{}}>{info.version}</td>
                                        </tr>
                                        <tr style={{ border: '1px solid black' }}>
                                            <td style={{ fontWeight: 'bold' }}>Serial</td>
                                            <td style={{}}>{info.serial}</td>
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
