/**
 * @fileoverview Power meter monitoring component for electrical current and energy tracking.
 * Provides real-time visualization of electrical measurements from ESP32-based power monitoring devices.
 * Features interactive charts, frequency analysis, and multi-channel current/energy tracking capabilities.
 */

import React, { useState, useEffect } from 'react';
import { Card, Table, Row, Col, Spinner, Alert, Button, Form } from 'react-bootstrap';
import Slider from 'rc-slider';
import { AdminMenu } from './AdminMenu';
import 'rc-slider/assets/index.css';
import './admin.css';
import { serverURL } from '../../constants';
import { DateTime } from 'luxon';

import { Line } from 'react-chartjs-2';
import type { ChartOptions, ChartData } from 'chart.js';

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

/** Slider marks for number of days selection (1-10 days) */
const marks = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10' };

/** Color palette for chart series visualization */
const PALETTE = [
    '#3366CC', '#DC3912', '#FF9900', '#109618', '#990099',
    '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395'
];

/**
 * Represents a data series for chart visualization.
 * Contains label and time-series data points.
 */
type Series = {
    /** Display label for the series */
    label: string;
    /** Array of time-value data points */
    data: { x: number; y: number }[]
};

/**
 * Metric types for power monitoring display.
 * Determines whether to show current measurements or cumulative energy.
 */
type Metrics = 'current' | 'energy';

/**
 * Available ADC1 pins on ESP32 for analog-to-digital conversion.
 * Used for selecting measurement channels during frequency scanning.
 */
const ADC1_PINS = [
    { value: '33', label: 'ADC1_5 (GPIO33)' },
    { value: '32', label: 'ADC1_4 (GPIO32)' },
    { value: '35', label: 'ADC1_7 (GPIO35)' },
    { value: '34', label: 'ADC1_6 (GPIO34)' },
    { value: '39', label: 'ADC1_3 (GPIO39)' },
    { value: '36', label: 'ADC1_0 (GPIO36)' }
];

/**
 * Main power meter monitoring component.
 * Provides comprehensive electrical monitoring with interactive charts, channel selection,
 * and real-time data visualization for up to 6 measurement channels.
 * 
 * @component
 * @returns {JSX.Element} Complete power meter monitoring interface
 * 
 * @example
 * ```tsx
 * // Usage in routing for administrator access
 * <Route path="/admin/powermeter" component={PowerMeter} />
 * 
 * // Direct component usage
 * <PowerMeter />
 * ```
 * 
 * @description
 * The PowerMeter component provides:
 * - Real-time current and energy monitoring for 6 channels
 * - Interactive time-series charts with zoom and pan capabilities
 * - Selectable time ranges (1-10 days of historical data)
 * - Channel-specific current scaling (channel 2 uses half-scale)
 * - Energy calculation with cumulative tracking
 * - Frequency scanning and analysis tools
 * - Raw waveform visualization
 * - Administrative controls for device configuration
 * 
 * @remarks
 * - Persists user preferences (selected channels, time range) in localStorage
 * - Channel 2 uses special scaling (raw/2) for current measurements
 * - Energy calculations include offset compensation (-0.005787)
 * - Supports Chart.js zoom plugin for detailed analysis
 * - Automatically removes trailing zero values from datasets
 */
export default function PowerMeter() {
    /** Number of days to display in historical view (1-10), persisted in localStorage */
    const [numDays, setNumDays] = useState<number>(
        JSON.parse(localStorage.getItem('numDays') || '1')
    );

    /** Array of boolean flags indicating which channels are active for display */
    const [selectedChannels, setSelectedChannels] = useState<boolean[]>(
        JSON.parse(localStorage.getItem('SelectedChannels') || '[true,false,false,false,false,false]')
    );

    /** Current metric type being displayed (current or energy) */
    const [metric, setMetric] = useState<Metrics>('current');

    /** Current measurement data series for all 6 channels */
    const [currentSeries, setCurrentSeries] = useState<Series[]>([]);

    /** Energy measurement data series for all 6 channels */
    const [energySeries, setEnergySeries] = useState<Series[]>([]);

    /**
     * Effect hook to fetch and process historical power data.
     * Fetches data when numDays or metric changes, processes raw measurements
     * into current and energy time series with proper scaling and offsets.
     */
    useEffect(() => {
        const timer = setTimeout(async () => {
            const url = new URL('/api/powerMeter/Hours', serverURL);
            url.searchParams.set('hours', (24 * numDays).toString());
            const res = await fetch(url.toString());
            const json = await res.json();
            if (json.error) return;
            const ts = json.start * 3600;
            const step = 60;

            // Initialize per-channel data arrays
            const cur: { x: number; y: number }[][] = Array.from({ length: 6 }, () => []);
            const eng: { x: number; y: number }[][] = Array.from({ length: 6 }, () => []);

            // Build data using original energy conversion (/1000 and -0.005787)
            json.amperages.forEach((chArr: number[], minuteIdx: number) => {
                const time = (ts + minuteIdx * step) * 1000;
                chArr.forEach((raw, chIdx) => {
                    // apply channel‐specific current
                    const currentVal = chIdx === 2 ? raw / 2 : raw;
                    cur[chIdx].push({ x: time, y: currentVal });

                    // energy increment: (240 * current) / 60 / 1000
                    const incr = (240 * currentVal / 60) / 1000;
                    // initial offset: -0.005787 (half for channel 2)
                    const offset = chIdx === 2 ? -0.005787 / 2 : -0.005787;
                    // cumulative energy
                    const prev = eng[chIdx].length ? eng[chIdx][eng[chIdx].length - 1].y : 0;
                    const energyVal = minuteIdx === 0
                        ? incr + offset
                        : prev + incr + offset;

                    eng[chIdx].push({ x: time, y: energyVal });
                });
            });
            // remove trailing 0's in the y-values
            cur.forEach((data) => {
                while (data[data.length - 1]?.y === 0) {
                    data.pop();
                }
            });
            eng.forEach((data) => {
                while (data[data.length - 1]?.y === 0) {
                    data.pop();
                }
            });

            setCurrentSeries(cur.map((data, i) => ({ label: `ch${i}`, data })));
            setEnergySeries(eng.map((data, i) => ({ label: `ch${i}`, data })));
        }, 500);
        return () => clearTimeout(timer);
    }, [numDays, metric]);

    /** Filtered data series based on current metric and selected channels */
    const series = (metric === 'current' ? currentSeries : energySeries)
        .filter((_, i) => selectedChannels[i]);

    /** Chart.js data configuration for the main time-series chart */
    const chartData: ChartData<'line'> = {
        datasets: series.map((s, idx) => ({
            label: s.label,
            data: s.data,
            fill: false,
            pointRadius: 0,
            borderWidth: 2,
            borderColor: PALETTE[idx % PALETTE.length],
            backgroundColor: PALETTE[idx % PALETTE.length],
        }))
    };

    /** Chart.js options configuration with zoom/pan capabilities */
    const options: ChartOptions<'line'> = {
        responsive: true,
        scales: {
            x: {
                type: 'time',
                time: { unit: 'hour' },
                title: { display: true, text: 'Time' }
            },
            y: {
                beginAtZero: true,
                title: { display: true, text: metric === 'current' ? 'Current (A)' : 'Energy (kWh)' }
            }
        },
        plugins: {
            title: { display: true, text: 'Power Meter' },
            legend: { display: false },
            zoom: {
                pan: { enabled: true, mode: 'x' },
                zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
            }
        }
    };

    /**
     * Toggles the visibility of a specific measurement channel.
     * Updates both state and localStorage for persistence.
     * 
     * @param i - Channel index (0-5) to toggle
     */
    const toggleChannel = (i: number) => {
        const arr = [...selectedChannels];
        arr[i] = !arr[i];
        setSelectedChannels(arr);
        localStorage.setItem('SelectedChannels', JSON.stringify(arr));
    };

    return (
        <>
            <AdminMenu span={4} offset={8} />
            <h3>Power Meter</h3>

            {/* Metric selector */}
            <Row className="mb-3">
                <Col>
                    <Form.Check inline type="radio" label="Current" checked={metric === 'current'} onChange={() => setMetric('current')} />
                    <Form.Check inline type="radio" label="Energy" checked={metric === 'energy'} onChange={() => setMetric('energy')} />
                </Col>
            </Row>

            {/* Chart */}
            <Row style={{ backgroundColor: '#FFFFE0', padding: 20, marginBottom: 20 }}>
                <Col>
                    <Line data={chartData} options={options} />
                </Col>
            </Row>

            {/* Controls */}
            <Row style={{ marginBottom: 20 }}>
                <Col xs={12} md={6}>
                    Number of Days: {numDays}
                    <Slider min={1} max={10} marks={marks} value={numDays} onChange={v => setNumDays(v as number)} />
                </Col>
                <Col xs={12} md={6}>
                    Active Channels:
                    {selectedChannels.map((v, i) => (
                        <Form.Check key={i} inline type="checkbox" label={`ch${i}`} checked={v} onChange={() => toggleChannel(i)} />
                    ))}
                </Col>
            </Row>

            {/* Scan button and other components */}
            <Row style={{ marginBottom: 20 }}>
                <Col xs={12} md={4}>
                    <Button onClick={() => {
                        const sel = ADC1_PINS.findIndex(p => p.value === '36');
                        fetch(new URL(`/api/powerMeter/runScan?sel=${sel}`, serverURL))
                            .then(res => res.ok && res.json())
                            .then(() => setTimeout(() => window.location.reload(), 2000))
                            .catch(console.error);
                    }}>
                        Scan
                    </Button>
                </Col>
            </Row>

            <DetailsDashboard />
            <StaggeredChannelPlots />
        </>
    );
}

/**
 * Interface representing detailed power meter analysis data.
 * Contains frequency analysis results and measurement statistics.
 */
interface DetailsData {
    /** Current operating frequency in Hz */
    currentFreq: number;
    /** Optimal frequency determined by scanning in Hz */
    bestFreq: number;
    /** Duration of the frequency scan in milliseconds */
    scanDuration: number;
    /** Mean values for each measurement channel */
    mean: number[];
    /** Signal amplitude for each measurement channel */
    amplitude: number[];
    /** Number of amplitude samples for each channel */
    amplitudeCnt: number[];
    /** Frequency scan results array */
    fscan: number[];
    /** Discrete Fourier Transform results array */
    dft: number[];
}

/**
 * Details dashboard component displaying power meter analysis and diagnostics.
 * Shows frequency analysis, channel statistics, and provides frequency optimization controls.
 * 
 * @component
 * @returns {JSX.Element} Dashboard with power meter analysis details
 * 
 * @example
 * ```tsx
 * // Used within PowerMeter component
 * <DetailsDashboard />
 * ```
 * 
 * @description
 * The DetailsDashboard provides:
 * - Current and optimal operating frequencies
 * - Frequency scan duration and results
 * - Per-channel measurement statistics (mean, amplitude, sample count)
 * - Interactive frequency scan chart
 * - DFT (Discrete Fourier Transform) analysis visualization
 * - Frequency optimization controls
 * 
 * @remarks
 * - Automatically fetches analysis data from /api/powerMeter/details
 * - Displays loading spinner during data fetch
 * - Shows error alerts if data retrieval fails
 * - Provides "Write Freq" button to apply optimal frequency settings
 * - DFT analysis helps identify signal characteristics and noise
 */
function DetailsDashboard() {
    /** Power meter analysis data from the API */
    const [data, setData] = useState<DetailsData | null>(null);
    /** Error message if data fetch fails */
    const [error, setError] = useState<string | null>(null);
    /** Loading state indicator */
    const [loading, setLoading] = useState<boolean>(true);

    /**
     * Effect hook to fetch power meter analysis details from the API.
     * Loads frequency analysis, channel statistics, and measurement data.
     */
    useEffect(() => {
        const url = new URL('/api/powerMeter/details', serverURL);
        fetch(url.toString())
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((json: DetailsData) => {
                setData(json);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
            </Spinner>
        );
    }
    if (error) {
        return <Alert variant="danger">Error: {error}</Alert>;
    }
    if (!data) {
        return null;
    }

    /** Frequency scan data points mapped to frequency/value pairs */
    const scanPoints = data.fscan.map((val, idx) => ({
        freq: data.currentFreq - 1 + idx * 0.1,
        value: val,
    }));

    /** DFT analysis data points mapped to frequency/value pairs */
    const dftPoints = data.dft.map((val, idx) => ({
        freq: idx * 240 / 2048,
        value: val,
    }));

    /** Chart.js data configuration for frequency scan visualization */
    const scanChartData = {
        labels: scanPoints.map(pt => pt.freq.toFixed(1)),
        datasets: [
            {
                label: 'Scan Value',
                data: scanPoints.map(pt => pt.value),
                fill: false,                          // no under-curve fill
                borderColor: '#007bff',               // bootstrap-primary blue
                backgroundColor: 'rgba(0,123,255,0.1)', // light blue for any point hovers
                borderWidth: 3,                       // thicker line
                pointRadius: 0,                       // hide individual points
                pointHoverRadius: 4,                  // show on hover if needed
            },
        ],
    };

    /** Chart.js data configuration for DFT visualization */
    const dftChartData = {
        labels: dftPoints.map(pt => pt.freq.toFixed(1)),
        datasets: [
            {
                label: 'DFT Value',
                data: dftPoints.map(pt => pt.value),
                fill: false,                          // no under-curve fill
                borderColor: '#007bff',               // bootstrap-primary blue
                backgroundColor: 'rgba(0,123,255,0.1)', // light blue for any point hovers
                borderWidth: 3,                       // thicker line
                pointRadius: 0,                       // hide individual points
                pointHoverRadius: 4,                  // show on hover if needed
            },
        ],
    };

    /** Chart.js data configuration for focused DFT range (507-517 samples) */
    const dftChartDataB = {
        labels: dftPoints.slice(507, 517).map(pt => pt.freq.toFixed(1)),
        datasets: [
            {
                label: 'DFT Value',
                data: dftPoints.slice(507, 517).map(pt => pt.value),
                fill: false,                          // no under-curve fill
                borderColor: '#007bff',               // bootstrap-primary blue
                backgroundColor: 'rgba(0,123,255,0.1)', // light blue for any point hovers
                borderWidth: 3,                       // thicker line
                pointRadius: 0,                       // hide individual points
                pointHoverRadius: 4,                  // show on hover if needed
            },
        ],
    };

    /** Chart.js options for frequency analysis charts */
    const scanChartOptions: ChartOptions<'line'> = {
        scales: {
            x: { title: { display: true, text: 'Frequency (Hz)' } },
            y: { title: { display: true, text: 'Value' } },
        },
        plugins: { legend: { display: false } },
        maintainAspectRatio: false,
    };

    /**
     * Handles writing the optimal frequency back to the power meter device.
     * Sends API request to apply the best frequency and reloads the page.
     */
    const handleWriteFreq = () => {
        const url = new URL('/api/powerMeter/writeFreq', serverURL);
        fetch(url.toString())
            .then(res => {
                if (!res.ok) throw new Error(`Write failed: ${res.status}`);
                return res.json();
            })
            .then(() => {
                setTimeout(() => window.location.reload(), 500);
            })
            .catch(err => console.error(err));
    };

    return (
        <div className="p-4">
            <Row className="mb-4">
                <Col>
                    <Card>
                        <Card.Body>
                            <Card.Title>Current Frequency</Card.Title>
                            <Card.Text>{data.currentFreq.toFixed(2)} Hz</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col>
                    <Card>
                        <Card.Body>
                            <Card.Title>Best Frequency</Card.Title>
                            <Card.Text>{data.bestFreq.toFixed(2)} Hz</Card.Text>
                            <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={handleWriteFreq}
                                style={{ marginTop: 8 }}
                            >
                                Write Freq
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
                <Col>
                    <Card>
                        <Card.Body>
                            <Card.Title>Scan Duration</Card.Title>
                            <Card.Text>{(data.scanDuration / 1000).toFixed(2)} s</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <h5>Channel Results</h5>
            <Table striped bordered hover size="sm" className="mb-4">
                <thead>
                    <tr>
                        <th>Channel</th>
                        <th>Mean</th>
                        <th>Amplitude</th>
                        <th>Samples Count</th>
                    </tr>
                </thead>
                <tbody>
                    {data.mean.map((m, i) => (
                        <tr key={i}>
                            <td>{i}</td>
                            <td>{m.toFixed(3)}</td>
                            <td>{data.amplitude[i].toFixed(3)}</td>
                            <td>{data.amplitudeCnt[i]}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <h5>Frequency Scan</h5>
            <div style={{ height: 200, backgroundColor: 'white', padding: 10 }}>
                <Line data={scanChartData} options={scanChartOptions} />
            </div>
            <h5>dft </h5>
            <div style={{ height: 200, backgroundColor: 'white', padding: 10 }}>
                <Line data={dftChartData} options={scanChartOptions} />
            </div>
            <h5>dft </h5>
            <div style={{ height: 200, backgroundColor: 'white', padding: 10 }}>
                <Line data={dftChartDataB} options={scanChartOptions} />
            </div>
        </div>
    );
}

/**
 * Staggered channel plots component for raw waveform visualization.
 * Displays individual channel waveforms in separate charts for detailed signal analysis.
 * 
 * @component
 * @returns {JSX.Element} Collection of individual channel waveform charts
 * 
 * @example
 * ```tsx
 * // Used within PowerMeter component
 * <StaggeredChannelPlots />
 * ```
 * 
 * @description
 * The StaggeredChannelPlots component provides:
 * - Individual waveform charts for each measurement channel
 * - Raw sample data visualization without time-series formatting
 * - Fixed Y-axis scale (1700-2100) for consistent comparison
 * - Separate chart for each active channel with distinct styling
 * 
 * @remarks
 * - Fetches raw sample data from /api/powerMeter/rawData
 * - Uses fixed Y-axis range optimized for typical ADC readings
 * - Hides X-axis labels for cleaner waveform display
 * - Each chart maintains aspect ratio for consistent viewing
 * - Useful for identifying noise, signal quality, and channel-specific issues
 */
const StaggeredChannelPlots = () => {
    /** Raw sample data arrays for each measurement channel */
    const [samples, setSamples] = useState([]);

    /**
     * Effect hook to fetch raw sample data for waveform visualization.
     * Retrieves unprocessed ADC readings for signal analysis.
     */
    useEffect(() => {
        const fetchData = async () => {
            try {
                const url = new URL('/api/powerMeter/rawData', serverURL);
                const response = await fetch(url.toString());
                const json = await response.json();
                if (json.samples && Array.isArray(json.samples)) {
                    setSamples(json.samples);
                }
            } catch (err) {
                console.error('Failed to fetch samples:', err);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="space-y-8">
            {samples.map((channelData: any, idx: number) => {
                /** Chart.js data configuration for individual channel waveform */
                const data = {
                    labels: channelData.map((_: any, i: number) => i),
                    datasets: [{
                        label: `Channel ${idx + 1}`,
                        data: channelData,
                        fill: false,
                        borderColor: 'rgba(75,192,192,1)',
                    }],
                };

                /** Chart.js options for waveform display with fixed Y-axis range */
                const options = {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { display: false },
                        y: {
                            suggestedMin: 1700,
                            suggestedMax: 2100,
                        },
                    },
                    plugins: {
                        legend: { display: true },
                    },
                };

                return (
                    <div
                        key={idx}
                        style={{ height: '200px', backgroundColor: '#ffffff', padding: '8px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                    >
                        <Line data={data} options={options} />
                    </div>
                );
            })}
        </div>
    );
};