import React, { useState, useEffect, useRef } from 'react'
import './sprinkler.css'
import { SprinklerInterface } from './SprinklerInterface'
import { itemNames, dataPoint } from './constants';
import { AdminMenu } from '../AdminMenu';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { sprinklerChannelColors, sprinklerCycle, sprinklerSelected, errorBanner, warningBanner, textMuted, borderMuted } from '../../../tokens';

type ChannelData = [number, number, number, number,][];
type EditMode = [number, number, number];

interface Rule {
    id: number;
    days: boolean[];
    startTime: number; // minutes from midnight
    durations: number[]; // minutes per channel
}

interface SuspendItem {
    date: number;      // unix timestamp (seconds) of the calendar day at midnight local
    startTime: number; // minutes from midnight
    ch: number;        // channel index
}

const d = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const RULE_COLORS = sprinklerChannelColors;


/**
 * Main Sprinkler Administrator Component.
 * Displays and controls the sprinkler system including:
 * - Channel schedules (individual and global)
 * - Manual overrides
 * - System status and variables
 * - Next watering times
 */
export default function Sprinkler() {

    const [editMode, setEditMode] = useState<EditMode>([0, 0, 0])
    const calendarBodyRef = useRef<HTMLTableSectionElement>(null);
    const [hr, setHr] = useState(0)
    const [min, setMin] = useState(0)
    const [keepSequential, setKeepSequential] = useState(() => {
        const saved = localStorage.getItem('sprinkler_keepSequential');
        return saved ? JSON.parse(saved) : Array(14).fill(false);
    });

    const [ruleModalOpen, setRuleModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<Rule | null>(null);
    const [suspendList, setSuspendList] = useState<SuspendItem[]>([]);

    const {
        readyState,
        channelData,
        update,
        numberOfDays,
        numberOfChannels,
        variables,
        suspensions,
        nextWatering,
        displayTime,
        channelActive,
        turnOnChannel,
        turnOffChannel,
        manual,
        sprinklerDataLoaded,
        compactDay,
        sendRules,
        sendSuspend,
        rulesError,
        rules,
        setRules,
    } = SprinklerInterface();

    useEffect(() => {
        localStorage.setItem('sprinkler_keepSequential', JSON.stringify(keepSequential));
    }, [keepSequential]);

    const [manualDuration, setManualDuration] = useState(10);
    const [manualTimeLeft, setManualTimeLeft] = useState<number>(0);
    const [activeManualChannel, setActiveManualChannel] = useState<number | null>(null);
    const [hasBecomeActive, setHasBecomeActive] = useState(false);

    useEffect(() => {
        if (!calendarBodyRef.current) return;
        const rows = Array.from(calendarBodyRef.current.querySelectorAll('tr')) as HTMLTableRowElement[];
        rows.forEach(r => (r.style.height = ''));
        const maxH = Math.max(...rows.map(r => r.getBoundingClientRect().height));
        rows.forEach(r => (r.style.height = `${maxH}px`));
    }, [rules, calendarBodyRef.current]);

    const handleSaveRule = (rule: Rule) => {
        setRules(current => {
            const index = current.findIndex(r => r.id === rule.id);
            const updated = index >= 0
                ? current.map((r, i) => i === index ? rule : r)
                : [...current, rule];
            sendRules(updated);
            return updated;
        });
        setRuleModalOpen(false);
        setEditingRule(null);
    };

    const handleDeleteRule = (id: number) => {
        setRules(current => {
            const updated = current.filter(r => r.id !== id);
            sendRules(updated);
            return updated;
        });
        setRuleModalOpen(false);
        setEditingRule(null);
    };


    /**
     * Converts minutes from midnight to a HH:MM string format.
     * @param min - Minutes from midnight.
     * @returns Time string in HH:MM format.
     */
    const minToTime = (min: number) => {
        let h: string | number = Math.floor(min / 60)
        let m: string | number = min - 60 * h
        if (h < 10) h = '0' + h
        if (m < 10) m = '0' + m
        return h + ":" + m
    }

    /**
     * Formats seconds into mm:ss
     */
    const formatTimeLeft = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }

    // Effect to handle manual countdown
    useEffect(() => {
        if (manualTimeLeft <= 0 || activeManualChannel === null) {
            if (activeManualChannel !== null) {
                // Timer finished
                setActiveManualChannel(null);
                setHasBecomeActive(false);
            }
            return;
        }

        const timer = setInterval(() => {
            setManualTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [manualTimeLeft, activeManualChannel]);

    // Effect to monitor channel status for auto-cancellation
    useEffect(() => {
        if (activeManualChannel !== null) {
            if (channelActive === activeManualChannel) {
                setHasBecomeActive(true);
            } else if (hasBecomeActive) {
                // Channel turned off externally or finished
                setManualTimeLeft(0);
                setActiveManualChannel(null);
                setHasBecomeActive(false);
            }
        }
    }, [channelActive, activeManualChannel, hasBecomeActive]);

    const handleManualOn = (index: number) => {
        turnOnChannel(index, manualDuration);
        setActiveManualChannel(index);
        setManualTimeLeft(manualDuration * 60);
        setHasBecomeActive(false);
    }

    const handleManualOff = (index: number) => {
        turnOffChannel(index);
        // Instant clear
        setActiveManualChannel(null);
        setManualTimeLeft(0);
        setHasBecomeActive(false);
    }

    /**
     * Handles manual toggle of a sprinkler channel.
     * Turn off executing channel if one is running, then turns on the requested one.
     * @param idx - The channel index to toggle.
     */
    const handleManualChange = (idx: number) => {
        turnOnChannel(idx);
    }

    /**
     * Toggles the suspension state for a channel's next watering.
     * @param channel - The channel index.
     * @param idx - The suspension index.
     */
    const chEn = (channel: number, idx: number) => {
        update({ channel: [channel], day: [-1], item: itemNames.SUSPEND0 + idx, value: suspensions[channel][idx] > 0 ? 0 : 1 });
    }

    /**
     * Toggles whether a specific day is enabled for a channel.
     * If the day was globally set, it switches the global status to 'Individual' first.
     * @param channel - The channel index.
     * @param day - The day index.
     */
    const toggleEnableDay = (channel: number, day: number) => {
        update({ channel: [channel], day: [day], item: itemNames.ENABLED, value: channelData[channel][day][itemNames.ENABLED] === 1 ? 0 : 1 });
    }

    /**
     * Enters edit mode for a specific cell (Start Time or Duration).
     * Populates the temporary state (hr, min) with the current values.
     * @param channelIndex - The channel index (-1 for global).
     * @param day - The day index (-1 for all days).
     * @param row - The row type (1 for Start Time, 2 for Duration).
     */
    const edit = (channelIndex: number, day: number, row: number) => {
        //row 1 -> start time(3), row 2 -> duration(0)
        if (day === -1) {
            setHr(0);
            setMin(0);
            setEditMode([channelIndex, day, row]);
            return;
        }

        if (channelIndex >= 0) {
            setHr(Math.floor(channelData[channelIndex][day][(row + 2) % 4] / 60));
            setMin(channelData[channelIndex][day][(row + 2) % 4] % 60);
            setEditMode([channelIndex, day, row]);
        }
    }

    /**
     * Saves the edited values and exits edit mode.
     * Updates either a single cell or bulk updates if day is -1.
     * Handles both individual channel updates and global setting updates.
     * @param channelIndex - The channel index (-1 for global).
     * @param day - The day index (-1 for all days).
     * @param row - The row type (1 for Start Time, 2 for Duration).
     */
    const endEdit = (channelIndex: number, day: number, row: number) => {
        if (day === -1) {
            const val = hr * 60 + min;
            const k = [...keepSequential];
            if (channelIndex >= 0) {
                const days = Array.from({ length: numberOfDays }, (_, i) => i);
                update({
                    channel: [channelIndex],
                    day: [day],
                    item: (row + 2) % 4,
                    value: val
                });

                for (let i = 0; i < numberOfDays; i++) {
                    if (k[i]) compactDay(i);
                }
            }
            setEditMode([0, 0, 0]);
            return;
        }

        if (channelIndex >= 0) {
            update({ channel: [channelIndex], day: [day], item: (row + 2) % 4, value: hr * 60 + min });
            if (keepSequential[day]) compactDay(day);
        }
        setEditMode([0, 0, 0]);
    }


    /**
     * Renders the row header for "Start" or "Duration".
     * Displays an "ALL" button to allow bulk editing.
     * When in bulk edit mode, displays the input fields and confirm/cancel buttons.
     * @param label - The label text ("Start" or "Duration").
     * @param chIdx - The channel index.
     * @param row - The row type identifier.
     * @returns The rendered JSX for the row header cell.
     */
    const renderRowHeader = (label: string, chIdx: number, row: number) => {
        if (editMode[0] === chIdx && editMode[1] === -1 && editMode[2] === row) {
            return (
                <td>
                    <div className="flex items-center justify-center gap-[2px]">
                        <input type="number" min="0" max="23" value={hr} onChange={(e) => { setHr(Number(e.target.value)) }} className={"w-[35px]"} />
                        <span>:</span>
                        <input type="number" min="0" max="59" value={min} onChange={(e) => { setMin(Number(e.target.value)) }} className={"w-[35px]"} />
                        <button onClick={() => endEdit(chIdx, -1, row)} className="[all:unset]" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'green' }}>&#10004;</button>
                        <button onClick={() => setEditMode([0, 0, 0])} className="[all:unset]" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'red' }}>&#10006;</button>
                    </div>
                </td>
            )
        }
        return (
            <td>
                {label}
                <button
                    onClick={() => edit(chIdx, -1, row)}
                    className="ml-1 text-[9px] py-[1px] px-[3px] cursor-pointer"
                >
                    ALL
                </button>
            </td>
        )
    }

    return (
        <>
            <AdminMenu span={4} offset={8} />
            {rulesError && (
                <div style={{ background: errorBanner.bg, color: errorBanner.text, padding: '10px', margin: '10px', borderRadius: '4px', fontWeight: 'bold' }}>
                    ESP did not acknowledge rules — check connection.
                </div>
            )}
            {sprinklerDataLoaded ?
                <div className="pb-[100px]">
                    <div className="container-fluid">
                        <div className="row">
                            <div className="col text-center">
                                <h3>Sprinkler System</h3>
                            </div>
                        </div>
                        <div className="row mb-2">
                            {/* <div className="col text-center">
                                <h4>{displayTime}</h4>
                            </div> */}
                        </div>
                        <div className="row g-3 align-items-start">
                            <div className="col-6">
                                <div className="card shadow-sm">
                                    <div className="card-header bg-dark text-white fw-semibold">System Variables</div>
                                    <div className="card-body p-0">
                                        <table className="table table-sm table-striped table-hover table-bordered mb-0">
                                            <thead className="table-secondary">
                                                <tr><th>Variable</th><th>Value</th><th>Local Time</th></tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className="fw-semibold text-muted">Status</td>
                                                    <td>{readyState}</td>
                                                    <td></td>
                                                </tr>
                                                <tr>
                                                    <td className="fw-semibold text-muted">channelActive</td>
                                                    <td>{channelActive}</td>
                                                    <td></td>
                                                </tr>
                                                {Object.keys(variables).map((key, idx) => {
                                                    const val = variables[key];
                                                    const isEpoch = val > 1774000000 && val < 3000000000;
                                                    return (
                                                        <tr key={idx}>
                                                            <td className="fw-semibold text-muted">{key}</td>
                                                            <td>{val}</td>
                                                            <td>{isEpoch ? new Date(val * 1000).toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' }) : ''}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            <div className="col-6">
                                <div className="card shadow-sm">
                                    <div className="card-header bg-dark text-white fw-semibold d-flex align-items-center gap-3">
                                        Manual Override
                                        {activeManualChannel !== null && manualTimeLeft > 0 &&
                                            <span className="badge bg-warning text-dark ms-auto">
                                                {formatTimeLeft(manualTimeLeft)} left
                                            </span>
                                        }
                                    </div>
                                    <div className="card-body p-0">
                                        <table className="table table-sm table-striped table-hover table-bordered mb-0">
                                            <thead className="table-secondary">
                                                <tr><th>Ch</th><th>Manual</th></tr>
                                            </thead>
                                            <tbody>
                                                {Array.from({ length: numberOfChannels }, (_, channelIndex) => {
                                                    const active = channelActive === channelIndex;
                                                    return (
                                                        <tr key={channelIndex} className={active ? 'blink-bg' : ''}>
                                                            <td className="fw-semibold">{channelIndex}</td>
                                                            <td>
                                                                <label className={"toggle-switch"}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={active}
                                                                        onChange={() => active ? handleManualOff(channelIndex) : handleManualOn(channelIndex)}
                                                                    />
                                                                    <span className={"toggle-slider"} />
                                                                </label>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                <tr className="table-light">
                                                    <td className="fw-semibold text-muted">Duration (min)</td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={manualDuration}
                                                            onChange={e => setManualDuration(Number(e.target.value))}
                                                            className="form-control form-control-sm w-[65px]"
                                                        />
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                    <div className="mt-[30px]">
                        <div className="flex justify-center items-center gap-[10px]">
                            <h3 className={"m-0"}>Rules</h3>
                            <button className="btn btn-sm btn-primary" onClick={() => {
                                setEditingRule(null);
                                setRuleModalOpen(true);
                            }}>New Rule</button>
                        </div>
                        <table className="my-5 w-[calc(100%-20px)] mx-[10px]">
                            <caption style={{ captionSide: 'bottom', textAlign: 'center', fontSize: '0.8em', color: textMuted }}>Click row to edit</caption>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Days</th>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                    <th>Durations (min)</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rules.map((rule, ruleIdx) => {
                                    const rc = RULE_COLORS[ruleIdx % RULE_COLORS.length];
                                    return (
                                        <tr key={rule.id} onClick={() => {
                                            setEditingRule(rule);
                                            setRuleModalOpen(true);
                                        }} style={{ cursor: 'pointer' }}>
                                            <td style={{ backgroundColor: rc }}>{ruleIdx + 1}</td>
                                            <td style={{ backgroundColor: rc }}>
                                                {rule.days.some(Boolean)
                                                    ? rule.days.map((isActive, idx) => isActive
                                                        ? <span key={idx} style={{ backgroundColor: idx < 7 ? sprinklerCycle.first : sprinklerCycle.second, padding: '1px 4px', marginRight: '2px', borderRadius: '3px' }}>
                                                            {d[idx % 7]}{idx >= 7 ? '₂' : ''}
                                                        </span>
                                                        : null)
                                                    : 'None'}
                                            </td>
                                            <td style={{ backgroundColor: rc }}>{Math.floor(rule.startTime / 60)}:{(rule.startTime % 60).toString().padStart(2, '0')}</td>
                                            <td style={{ backgroundColor: rc }}>{(() => { const e = (rule.startTime + rule.durations.reduce((a, b) => a + b, 0)) % 1440; return `${Math.floor(e / 60)}:${(e % 60).toString().padStart(2, '0')}`; })()}</td>
                                            <td style={{ backgroundColor: rc }}>
                                                {rule.durations.map((dur, i) => dur > 0 ? `Ch${i}:${dur}` : null).filter(Boolean).join(', ')}
                                            </td>
                                            <td onClick={e => { e.stopPropagation(); handleDeleteRule(rule.id); }} style={{ backgroundColor: rc, color: 'red', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' }}>✗</td>
                                        </tr>
                                    )
                                })}
                                {rules.length === 0 && <tr><td colSpan={6}>No rules defined.</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {(() => {
                        const boundaryDate = new Date(variables.boundary * 1000);
                        const fmtTime = (mins: number) => `${Math.floor(mins / 60)}:${(mins % 60).toString().padStart(2, '0')}`;
                        const now = new Date();
                        const nowMinutes = now.getHours() * 60 + now.getMinutes();
                        return (
                            <div className="mt-[30px] px-[10px]">
                                <h3>4-Week Calendar</h3>
                                <table className={"table-fixed w-full"}>
                                    <thead>
                                        <tr>
                                            {Array.from({ length: 7 }, (_, i) => {
                                                const d2 = new Date(boundaryDate);
                                                d2.setDate(boundaryDate.getDate() + i);
                                                return <th key={i}>{d2.toLocaleDateString('en-US', { weekday: 'short' })}</th>;
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody ref={calendarBodyRef}>
                                        {Array.from({ length: 4 }, (_, week) => (
                                            <tr key={week}>
                                                {Array.from({ length: 7 }, (_, dow) => {
                                                    const i = week * 7 + dow;
                                                    const cellDate = new Date(boundaryDate);
                                                    cellDate.setDate(boundaryDate.getDate() + i);
                                                    const cycleDay = i % numberOfDays;
                                                    const isToday = i === variables.daysSinceBoundary;
                                                    const dayRules = rules.map((r, ri) => ({ r, ri })).filter(({ r }) => r.days[cycleDay]);
                                                    return (
                                                        <td key={dow} style={{
                                                            aspectRatio: '1',
                                                            verticalAlign: 'top',
                                                            backgroundColor: isToday ? '#fffde7' : cycleDay < 7 ? sprinklerCycle.first : sprinklerCycle.second,
                                                            padding: '4px',
                                                            fontSize: '12px',
                                                            border: '1px solid black',
                                                            outline: isToday ? '2px solid orange' : undefined,
                                                            overflow: 'hidden'
                                                        }}>
                                                            <div className="font-bold mb-[3px]">
                                                                {cellDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                            </div>
                                                            {dayRules.map(({ r, ri }) => {
                                                                let chStart = r.startTime;
                                                                const rc = RULE_COLORS[ri % RULE_COLORS.length];
                                                                const dateKey = Math.floor(cellDate.getTime() / 1000);
                                                                return r.durations.map((dur: number, ci: number) => {
                                                                    if (dur === 0) { chStart += dur; return null; }
                                                                    const startForLine = chStart;
                                                                    const suspended = suspendList.some(s => s.date === dateKey && s.startTime === startForLine && s.ch === ci);
                                                                    const active = isToday && nowMinutes >= startForLine && nowMinutes < startForLine + dur;
                                                                    const mismatch = active && channelActive !== ci;
                                                                    const lineClass = active ? (mismatch ? 'blink-red' : 'blink-bg') : '';
                                                                    const line = (
                                                                        <div key={`${ri}-${ci}`} onClick={() => {
                                                                            const item = { date: dateKey, startTime: startForLine, ch: ci };
                                                                            setSuspendList(suspended
                                                                                ? suspendList.filter(s => !(s.date === dateKey && s.startTime === startForLine && s.ch === ci))
                                                                                : [...suspendList, item]);
                                                                            sendSuspend(item, !suspended);
                                                                        }} className={lineClass} style={{ cursor: 'pointer', backgroundColor: active ? undefined : suspended ? 'rgb(200,200,200)' : rc, borderRadius: '3px', padding: '1px 3px', marginBottom: '2px', fontSize: '11px' }}>
                                                                            {fmtTime(startForLine)} - {dur} min Ch {ci}
                                                                        </div>
                                                                    );
                                                                    chStart += dur;
                                                                    return line;
                                                                });
                                                            })}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })()}

                    <RuleModal
                        isOpen={ruleModalOpen}
                        onClose={() => setRuleModalOpen(false)}
                        onSave={handleSaveRule}
                        onDelete={handleDeleteRule}
                        initialRule={editingRule}
                        numberOfChannels={numberOfChannels}
                        numberOfDays={numberOfDays}
                        rules={rules}
                    />

                </div >
                : <h1>Data Loading... (Sprinkler ESP May Not Be Connected)</h1>
            }
        </>
    )
}

function RuleModal({
    isOpen,
    onClose,
    onSave,
    onDelete,
    initialRule,
    numberOfChannels,
    numberOfDays,
    rules
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (rule: Rule) => void;
    onDelete: (id: number) => void;
    initialRule: Rule | null;
    numberOfChannels: number;
    numberOfDays: number;
    rules: Rule[];
}) {
    const [days, setDays] = useState<boolean[]>(Array(numberOfDays).fill(false));
    const [startHr, setStartHr] = useState(6);
    const [startMin, setStartMin] = useState(0);
    const [durations, setDurations] = useState<number[]>(Array(numberOfChannels).fill(0));

    useEffect(() => {
        if (initialRule) {
            setDays(initialRule.days);
            setStartHr(Math.floor(initialRule.startTime / 60));
            setStartMin(initialRule.startTime % 60);
            setDurations(initialRule.durations);
        } else {
            setDays(Array(numberOfDays).fill(false));
            setStartHr(6);
            setStartMin(0);
            setDurations(Array(numberOfChannels).fill(0));
        }
    }, [initialRule, isOpen, numberOfChannels, numberOfDays]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({
            id: initialRule ? initialRule.id : Date.now(),
            days,
            startTime: startHr * 60 + startMin,
            durations: durations
        });
    };

    const overlaps: Rule[] = !initialRule && durations.some(d => d > 0) ? (() => {
        const start = startHr * 60 + startMin;
        const end = start + durations.reduce((a, b) => a + b, 0);
        return rules.filter(r => {
            if (!days.some((active, i) => active && r.days[i])) return false;
            const rEnd = r.startTime + r.durations.reduce((a, b) => a + b, 0);
            return start < rEnd && r.startTime < end;
        });
    })() : [];

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000]">
            <div className="bg-white p-5 rounded max-h-[90vh] overflow-y-auto">
                <h2>{initialRule ? 'Edit Rule' : 'New Rule'}</h2>

                <div className={"mb-[15px]"}>
                    {[0, 7].filter(offset => offset < numberOfDays).map(offset => {
                        const weekDays = Array.from({ length: Math.min(7, numberOfDays - offset) }, (_, i) => offset + i);
                        const allChecked = weekDays.every(i => days[i]);
                        const bg = offset === 0 ? sprinklerCycle.first : sprinklerCycle.second;
                        const label = offset === 0 ? 'Week 1' : 'Week 2';
                        const firstColPct = (1.1 / 9.1 * 100).toFixed(2) + '%';
                        const otherColPct = (1 / 9.1 * 100).toFixed(2) + '%';
                        const sep = `2px solid ${borderMuted}`;
                        return (
                            <table key={offset} style={{ marginBottom: '6px', tableLayout: 'fixed', width: '100%' }}>
                                <colgroup>
                                    <col style={{ width: firstColPct }} />
                                    {Array.from({ length: 8 }, (_, i) => <col key={i} style={{ width: otherColPct }} />)}
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th style={{ backgroundColor: bg, borderRight: sep }}>{label}</th>
                                        <th style={{ backgroundColor: bg, borderRight: sep }}>All</th>
                                        {weekDays.map(i => <th key={i} style={{ backgroundColor: bg }}>{d[i % 7]}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ backgroundColor: bg, borderRight: sep }} />
                                        <td style={{ backgroundColor: allChecked ? sprinklerSelected : bg, cursor: 'pointer', textAlign: 'center', borderRight: sep }}
                                            onClick={() => { const n = [...days]; weekDays.forEach(i => { n[i] = !allChecked; }); setDays(n); }}>
                                            <input type="checkbox" checked={allChecked} readOnly style={{ cursor: 'pointer' }} />
                                        </td>
                                        {weekDays.map(i => (
                                            <td key={i} style={{ backgroundColor: days[i] ? sprinklerSelected : bg, cursor: 'pointer', textAlign: 'center' }}
                                                onClick={() => { const n = [...days]; n[i] = !n[i]; setDays(n); }}>
                                                <input type="checkbox" checked={days[i]} readOnly style={{ cursor: 'pointer' }} />
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        );
                    })}
                </div>

                <div className="mb-[15px] flex items-center gap-[10px]">
                    <h4 className="m-0">Start Time</h4>
                    <DatePicker
                        className="bg-[rgb(200,230,255)]"
                        selected={(() => {
                            const date = new Date();
                            date.setHours(startHr);
                            date.setMinutes(startMin);
                            return date;
                        })()}
                        onChange={(date: Date | null) => {
                            if (date) {
                                setStartHr(date.getHours());
                                setStartMin(date.getMinutes());
                            }
                        }}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="h:mm aa"
                    />
                </div>

                <div className={"mb-[15px]"}>
                    <table className={"table-fixed w-full"}>
                        <colgroup>
                            <col style={{ width: (1.1 / (1.1 + 1 + numberOfChannels) * 100).toFixed(2) + '%' }} />
                            {Array.from({ length: 1 + numberOfChannels }, (_, i) => (
                                <col key={i} style={{ width: (1 / (1.1 + 1 + numberOfChannels) * 100).toFixed(2) + '%' }} />
                            ))}
                        </colgroup>
                        <thead>
                            <tr>
                                <th style={{ borderRight: `2px solid ${borderMuted}` }}>Duration</th>
                                <th style={{ borderRight: `2px solid ${borderMuted}` }}>All</th>
                                {durations.map((_, idx) => <th key={idx}>Ch {idx}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ textAlign: 'center', fontSize: '0.85em', borderRight: `2px solid ${borderMuted}` }}>(min)</td>
                                <td style={{ borderRight: `2px solid ${borderMuted}` }}>
                                    <input
                                        type="number"
                                        value={durations.every(v => v === durations[0]) ? durations[0] : ''}
                                        placeholder="—"
                                        onChange={e => setDurations(Array(numberOfChannels).fill(Number(e.target.value)))}
                                        style={{ width: '45px' }}
                                    />
                                </td>
                                {durations.map((dur, idx) => (
                                    <td key={idx}>
                                        <input
                                            type="number"
                                            value={dur}
                                            onChange={e => {
                                                const newDurations = [...durations];
                                                newDurations[idx] = Number(e.target.value);
                                                setDurations(newDurations);
                                            }}
                                            style={{ width: '45px' }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                {overlaps.length > 0 && (
                    <div style={{ backgroundColor: warningBanner.bg, border: `1px solid ${warningBanner.border}`, borderRadius: '4px', padding: '8px', marginBottom: '10px', color: warningBanner.text }}>
                        Overlaps with: {overlaps.map((r, i) => {
                            const rEnd = (r.startTime + r.durations.reduce((a, b) => a + b, 0)) % 1440;
                            return <span key={i}>{i > 0 ? ', ' : ''}{Math.floor(r.startTime / 60)}:{(r.startTime % 60).toString().padStart(2, '0')}–{Math.floor(rEnd / 60)}:{(rEnd % 60).toString().padStart(2, '0')}</span>;
                        })}
                    </div>
                )}
                <div className="flex justify-between mt-5">
                    {initialRule && <button onClick={() => onDelete(initialRule.id)} className="bg-red-500 text-white">Delete</button>}
                    <div className="flex gap-[10px] ml-auto">
                        <button onClick={onClose}>Cancel</button>
                        <button onClick={handleSave} disabled={durations.reduce((a, b) => a + b, 0) === 0 || !days.some(Boolean)} style={{ backgroundColor: durations.reduce((a, b) => a + b, 0) === 0 || !days.some(Boolean) ? 'grey' : 'green', color: 'white' }}>OK</button>
                    </div>
                </div>
            </div>
        </div>
    );
}