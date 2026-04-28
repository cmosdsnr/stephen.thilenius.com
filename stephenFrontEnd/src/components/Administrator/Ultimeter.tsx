import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
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
import { useWss } from '../../contexts/WssContext';
import AdminPageLayout from './AdminPageLayout';
import { useInterval } from '../../hooks/useInterval';
import { API } from '../../api';
import { SkeletonChart } from '../Skeleton';
import { chartTeal, chartRed } from '../../tokens';

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

const Ultimeter = () => {
    const [tooLong, setTooLong] = useState<boolean>(false);
    const [lastSeen, setLastSeen] = useState<string>("");
    const [date, setDate] = useState<number>(Math.floor(new Date().getTime() / 1000));
    const {
        ultimeterUpdate,      // speed, direction, timestamp triplet
        ultimeterLastUpdate,  // timestamp of last update (either data, or ping
        subscribe,
        unsubscribe
    } = useWss();

    /** Range params state drives the query key so React Query re-fetches on range change */
    const [rangeParams, setRangeParams] = useState<{ from: Date; to: Date }>(() => {
        const now = new Date();
        return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - 13, 0, 0, 0), to: now };
    });

    /**
     * React Query hook to fetch historical ultimeter wind data.
     * Re-fetches automatically when rangeParams changes.
     */
    const { data: queryData, isLoading, error } = useQuery<WindPoint[]>(
        ['ultimeterRange', rangeParams.from.toISOString(), rangeParams.to.toISOString()],
        async () => {
            console.log("loadRange", rangeParams.from, "to", rangeParams.to);
            const response = await fetch(API.ultimeterRange(rangeParams.from, rangeParams.to));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const res = await response.json();
            console.log(res);
            console.log("received", res.data.length / 240.0, "hours of data");
            let start = 3600000 * res.fromHour;
            const data: WindPoint[] = [];
            res.data.forEach((dp: any) => {
                data.push({ timestamp: start, speed: dp[0], direction: dp[1] });
                start += 15000;
            });
            return data;
        },
        { keepPreviousData: true }
    );

    const historicalData: WindPoint[] = queryData ?? [];

    /** Live data points appended by WebSocket updates since the last range load */
    const [livePoints, setLivePoints] = useState<WindPoint[]>([]);

    useInterval(function () {
        setDate(Math.floor(new Date().getTime() / 1000));
    }, 1000)

    useEffect(() => {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log(timeZone);
        console.log(rangeParams.from.toLocaleString());
        subscribe("ultimeter");
        return () => {
            unsubscribe("ultimeter");
        };
    }, []);

    /** Reset live points whenever a new range is fetched */
    useEffect(() => {
        setLivePoints([]);
    }, [rangeParams]);

    useEffect(() => {
        if (ultimeterLastUpdate > 0) {
            // time in s since the desk ESP sent an ultimeter update
            const t = date - ultimeterLastUpdate;
            if (t > 200)
                setTooLong(true);
            else
                setTooLong(false);

            if (t < 60) setLastSeen(new Date(1000 * ultimeterLastUpdate).toLocaleString() + " (less than a minute ago)");
            else if (t < 3600) setLastSeen(new Date(1000 * ultimeterLastUpdate).toLocaleString() + "(" + Math.round(t / 60) + " minutes ago)");
            else if (t < 86400) setLastSeen(new Date(1000 * ultimeterLastUpdate).toLocaleString() + "(" + Math.round(t / 3600) + " hours ago)");
            else setLastSeen(new Date(1000 * ultimeterLastUpdate).toLocaleString() + "(" + Math.round(t / 86400) + " days ago");
            // console.log("ultimeterLastUpdate:", ultimeterLastUpdate);
        }
    }, [ultimeterLastUpdate, date]);

    useEffect(() => {
        if (ultimeterUpdate) {
            console.log("ultimeterUpdate:", ultimeterUpdate);
            setLivePoints(prevData => [...prevData, { timestamp: 1000 * ultimeterUpdate[2], speed: ultimeterUpdate[0], direction: ultimeterUpdate[1] }]);
        }
    }, [ultimeterUpdate]);

    /** Selects a relative date range based on number of days from current time */
    const selectRange = (days: number) => {
        const now = new Date();
        const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        setRangeParams({ from, to: now });
    };

    /** Merged data: historical from query + live WebSocket points */
    const ultimeterData: WindPoint[] = [...historicalData, ...livePoints];

    const chartDataSpeed = {
        labels: ultimeterData.map(dp => new Date(dp.timestamp)),
        datasets: [
            {
                label: 'Speed',
                data: ultimeterData.map(dp => dp.speed),
                borderColor: chartTeal.solid,
                backgroundColor: chartTeal.fill,
                fill: false,
            },
        ],
    };

    const chartDataDirection = {
        labels: ultimeterData.map(dp => new Date(dp.timestamp)),
        datasets: [
            {
                label: 'Direction',
                data: ultimeterData.map(dp => dp.direction),
                borderColor: chartRed.solid,
                backgroundColor: chartRed.fill,
                fill: false,
            },
        ],
    };

    const options = {
        responsive: true,
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'hour',
                },
            },
            y: {
                beginAtZero: true,
            },
        },
        plugins: {
            zoom: {
                pan: {
                    enabled: true,
                    mode: 'xy',
                },
                zoom: {
                    enabled: true,
                    mode: 'xy',
                },
            },
        },
    };

    const rangeButtons = [
        { label: 'Past 1 Day', days: 1 },
        { label: 'Past 4 Days', days: 4 },
        { label: 'Past 7 Days', days: 7 },
    ];

    return (
        <AdminPageLayout title="Ultimeter Wind Data" subtitle={
            <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '0.75rem', color: tooLong ? '#ef4444' : '#6a9ac4', marginTop: '0.5rem' }}>
                last update: {lastSeen}
            </p>
        }>
            <div style={{ maxWidth: 960, margin: '0 auto' }}>

                {/* Alert banner */}
                {tooLong && (
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', borderLeft: '4px solid #ef4444', borderRadius: 6, padding: '0.75rem 1.25rem', marginBottom: '1.5rem', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.82rem', color: '#ef4444' }}>
                        No data received in the last 200 seconds
                    </div>
                )}

                {/* Time range controls */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,24,48,0.07)', marginBottom: '1.5rem', overflow: 'hidden' }}>
                    <div style={{ background: '#001830', borderBottom: '2px solid #f59e0b', padding: '0.75rem 1.25rem' }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f59e0b' }}>
                            Time Range
                        </span>
                    </div>
                    <div style={{ padding: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {rangeButtons.map(({ label, days }) => (
                            <button
                                key={days}
                                onClick={() => selectRange(days)}
                                style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'transparent', color: '#001830', border: '1.5px solid #e2e8f0', borderRadius: 4, padding: '0.35rem 1rem', cursor: 'pointer' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.color = '#f59e0b'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#001830'; }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Speed chart */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,24,48,0.07)', marginBottom: '1.5rem', overflow: 'hidden' }}>
                    <div style={{ background: '#001830', borderBottom: '2px solid #f59e0b', padding: '0.75rem 1.25rem' }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f59e0b' }}>
                            Wind Speed
                        </span>
                    </div>
                    <div style={{ padding: '1.25rem' }}>
                        {isLoading && <SkeletonChart height={280} />}
                        {error && <p style={{ color: '#ef4444', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.82rem' }}>Error: {(error as Error).message}</p>}
                        <Line data={chartDataSpeed} options={options as any} />
                    </div>
                </div>

                {/* Direction chart */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,24,48,0.07)', marginBottom: '1.5rem', overflow: 'hidden' }}>
                    <div style={{ background: '#001830', borderBottom: '2px solid #f59e0b', padding: '0.75rem 1.25rem' }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f59e0b' }}>
                            Wind Direction
                        </span>
                    </div>
                    <div style={{ padding: '1.25rem' }}>
                        <Line data={chartDataDirection} options={options as any} />
                    </div>
                </div>

            </div>
        </AdminPageLayout>
    );
};

export default Ultimeter;
