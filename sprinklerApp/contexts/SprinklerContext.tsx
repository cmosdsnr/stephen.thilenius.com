/**
 * @module SprinklerContext
 * @description Primary application state context for the sprinkler system.
 *
 * On mount, fetches the current schedule via HTTP from
 * `GET /api/sprinkler/load` and derives an editable **rules** list from it.
 * Subsequent real-time updates arrive over the WebSocket (via
 * {@link module:WssContext}) and are merged into local state.
 *
 * ### Schedule model
 * The device runs a repeating **14-day cycle** (`NUM_DAYS = 14`).  Each day
 * can contain any number of **schedule entries** — flat objects describing a
 * single channel firing at a specific time:
 * ```
 * { day: number, ch: number, start: number, duration: number }
 * ```
 *
 * ### Rules abstraction
 * The app groups contiguous channel firings on the same day into logical
 * "blocks", then further groups identical blocks across days into **rules**.
 * A rule looks like:
 * ```
 * { id: number, startTime: number, days: boolean[14], durations: number[7] }
 * ```
 * Rules are a pure UI convenience — the device only understands raw schedule
 * entries, so every save serialises the current rules back into entries via
 * {@link module:SprinklerContext~sendRulesToESP}.
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useWss } from './WssContext';
import { SERVER_URL, Codes, SendCodes, NUM_CHANNELS, NUM_DAYS } from '../constants/sprinkler';

// ── Shared types ──────────────────────────────────────────────────────────────

export interface ScheduleEntry {
    day: number;
    ch: number;
    start: number;
    duration: number;
}

export interface Rule {
    id: number;
    startTime: number;
    days: boolean[];
    durations: number[];
}

export interface Suspension {
    ch: number;
    date: number;
    startTime: number;
}

export interface SprinklerVariables {
    epoch?: number;
    boundary?: number;
    daysSinceBoundary?: number;
    dayStart?: number;
    localTime?: number;
}

export interface DayEntry {
    startTime: number;
    durations: number[];
}

interface SprinklerContextValue {
    schedule: ScheduleEntry[];
    variables: SprinklerVariables;
    name: string;
    channelActive: number;
    dataLoaded: boolean;
    rules: Rule[];
    suspensions: Suspension[];
    acknowledged: boolean;
    rulesError: boolean;
    readyState: number;
    addRule: (rule: Omit<Rule, 'id'>) => void;
    saveRule: (rule: Rule) => void;
    deleteRule: (id: number) => void;
    sendSuspend: (item: Suspension, add: boolean) => void;
    isSuspended: (ch: number, date: number, startTime: number) => boolean;
    turnOnChannel: (channel: number, duration?: number) => void;
    turnOffChannel: (channel: number) => void;
    reload: () => void;
    /** Placeholder for future per-day direct-edit flow. */
    dayMap?: Record<number, DayEntry>;
    /** Placeholder for future per-day direct-edit flow. */
    updateDay?: (day: number, startTime: number, durations: number[]) => void;
}

const SprinklerContext = createContext<SprinklerContextValue | null>(null);

// ── Internal helpers ─────────────────────────────────────────────────────────

interface Block {
    day: number;
    startTime: number;
    durations: number[];
    lastChannel: number;
    lastEnd: number;
}

/**
 * Group a flat schedule entry array into time-contiguous "blocks" per day.
 * Within each day, entries are sorted by start time then channel index.
 * A new block begins whenever the channel order resets or there is a gap
 * between entries.
 *
 * @param {ScheduleEntry[]} schedule
 * @returns {Block[]}
 */
function splitScheduleIntoBlocks(schedule: ScheduleEntry[]): Block[] {
    const byDay: ScheduleEntry[][] = Array.from({ length: NUM_DAYS }, () => []);

    for (const entry of schedule) {
        if (entry?.day < 0 || entry?.day >= NUM_DAYS) continue;
        byDay[entry.day].push(entry);
    }

    return byDay.flatMap((entries, day) => {
        const sorted = [...entries].sort((left, right) => {
            if (left.start !== right.start) return left.start - right.start;
            return left.ch - right.ch;
        });

        const blocks: Block[] = [];
        let current: Block | null = null;

        for (const entry of sorted) {
            const startsNewBlock = !current
                || entry.ch <= current.lastChannel
                || entry.start !== current.lastEnd;

            if (startsNewBlock) {
                current = {
                    day,
                    startTime: entry.start,
                    durations: Array(NUM_CHANNELS).fill(0),
                    lastChannel: -1,
                    lastEnd: entry.start,
                };
                blocks.push(current);
            }

            current!.durations[entry.ch] = entry.duration;
            current!.lastChannel = entry.ch;
            current!.lastEnd = entry.start + entry.duration;
        }

        return blocks;
    });
}

/**
 * Derive a deduplicated rules list from a flat schedule entry array.
 * Blocks with an identical start-time and duration signature across days are
 * merged into a single rule whose `days` bitmask records all matching days.
 *
 * @param {ScheduleEntry[]} schedule
 * @returns {Rule[]}
 */
function deriveRulesFromSchedule(schedule: ScheduleEntry[]): Rule[] {
    const groupedRules = new Map<string, Omit<Rule, 'id'>>();

    for (const block of splitScheduleIntoBlocks(schedule)) {
        const signature = `${block.startTime}|${block.durations.join(',')}`;
        if (!groupedRules.has(signature)) {
            groupedRules.set(signature, {
                startTime: block.startTime,
                days: Array(NUM_DAYS).fill(false),
                durations: [...block.durations],
            });
        }
        groupedRules.get(signature)!.days[block.day] = true;
    }

    return [...groupedRules.values()]
        .sort((left, right) => {
            if (left.startTime !== right.startTime) return left.startTime - right.startTime;
            return left.durations.join(',').localeCompare(right.durations.join(','));
        })
        .map((rule, index) => ({ ...rule, id: index + 1 }));
}

// ── Provider ─────────────────────────────────────────────────────────────────

interface LoadResponse {
    error?: string;
    schedule?: ScheduleEntry[];
    variables?: SprinklerVariables;
    name?: string;
    runningChannel?: number;
}

/**
 * Context provider that owns the sprinkler schedule, rules, suspensions, and
 * channel state. Must be nested inside {@link module:WssContext.WssProvider}.
 *
 * @param {{ children: React.ReactNode }} props
 * @returns {React.ReactElement}
 */
export function SprinklerProvider({ children }: { children: React.ReactNode }): React.ReactElement {
    const { sprinklerMessages, popSprinklerMessage, sendMessage, readyState } = useWss();

    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [variables, setVariables] = useState<SprinklerVariables>({});
    const [name, setName] = useState('');
    const [channelActive, setChannelActive] = useState(-1);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [rules, setRules] = useState<Rule[]>([]);
    const [suspensions, setSuspensions] = useState<Suspension[]>([]);
    const [rulesError, setRulesError] = useState(false);
    const [acknowledged, setAcknowledged] = useState(true);
    const ackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nextRuleId = useRef(1);

    // ── HTTP initial load ────────────────────────────────────────────────────

    /**
     * Fetch the current schedule, variables, and device name from the backend
     * and populate local state. Called automatically on mount and exposed as
     * `reload` for manual refresh.
     */
    const loadData = useCallback(() => {
        fetch(`${SERVER_URL}/api/sprinkler/load`)
            .then(r => r.json() as Promise<LoadResponse>)
            .then(data => {
                if (data.error) { console.warn('SprinklerContext load:', data.error); return; }
                const nextSchedule = data.schedule ?? [];
                const nextRules = deriveRulesFromSchedule(nextSchedule);

                setSchedule(nextSchedule);
                setRules(nextRules);
                setVariables(data.variables ?? {});
                setName(data.name ?? '');
                setChannelActive(data.runningChannel ?? -1);
                nextRuleId.current = nextRules.reduce((max, rule) => Math.max(max, rule.id + 1), 1);
                setDataLoaded(true);
            })
            .catch(e => console.warn('SprinklerContext fetch failed:', e));
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ── WebSocket messages ───────────────────────────────────────────────────

    useEffect(() => {
        if (sprinklerMessages.length === 0) return;
        const data = sprinklerMessages[0];
        popSprinklerMessage();

        switch (data.code) {
            case Codes.UPDATE_VARIABLES:
                setVariables(prev => ({ ...prev, ...(data.variable as Partial<SprinklerVariables>) }));
                break;
            case Codes.ON_OFF:
                setChannelActive((data.on as number) === 1 ? (data.channel as number) : -1);
                break;
            case Codes.ACKNOWLEDGE_RULES:
                if (ackTimerRef.current) { clearTimeout(ackTimerRef.current); ackTimerRef.current = null; }
                setAcknowledged(true);
                setRulesError(false);
                break;
            default:
                break;
        }
    }, [sprinklerMessages]);

    // ── Outbound: rules ──────────────────────────────────────────────────────

    /**
     * Serialise the given rules array and send it to the ESP via WebSocket.
     * Starts a 30-second acknowledgement timer; if no `ACKNOWLEDGE_RULES`
     * message arrives before the timeout, `rulesError` is set to `true`.
     *
     * @param {Rule[]} r
     */
    const sendRulesToESP = useCallback((r: Rule[]) => {
        if (ackTimerRef.current) clearTimeout(ackTimerRef.current);
        setAcknowledged(false);
        setRulesError(false);
        ackTimerRef.current = setTimeout(() => {
            setAcknowledged(prev => { if (!prev) setRulesError(true); return prev; });
            ackTimerRef.current = null;
        }, 30000);
        const msg = {
            command: 'sprinkler',
            data: {
                code: SendCodes.UPDATE_RULES,
                rules: r.map(rule => ({
                    ...rule,
                    days: rule.days.reduce((acc: number, on: boolean, i: number) => on ? acc | (1 << i) : acc, 0),
                })),
            },
        };
        sendMessage(JSON.stringify(msg));
    }, [sendMessage]);

    // ── Rules CRUD ───────────────────────────────────────────────────────────

    /**
     * Add a new rule to the list and push the updated set to the device.
     * The rule is assigned the next available `id`.
     *
     * @param {Omit<Rule, 'id'>} rule - Rule without an id.
     */
    const addRule = useCallback((rule: Omit<Rule, 'id'>) => {
        const newRule: Rule = { ...rule, id: nextRuleId.current++ };
        setRules(prev => {
            const next = [...prev, newRule];
            sendRulesToESP(next);
            return next;
        });
    }, [sendRulesToESP]);

    /**
     * Replace an existing rule (matched by `id`) and push the updated set to
     * the device.
     *
     * @param {Rule} rule
     */
    const saveRule = useCallback((rule: Rule) => {
        setRules(prev => {
            const next = prev.map(r => r.id === rule.id ? rule : r);
            sendRulesToESP(next);
            return next;
        });
    }, [sendRulesToESP]);

    /**
     * Remove the rule with the given `id` and push the updated set to the device.
     *
     * @param {number} id - The `id` of the rule to remove.
     */
    const deleteRule = useCallback((id: number) => {
        setRules(prev => {
            const next = prev.filter(r => r.id !== id);
            sendRulesToESP(next);
            return next;
        });
    }, [sendRulesToESP]);

    // ── Outbound: suspend ────────────────────────────────────────────────────

    /**
     * Add or remove a suspension for a specific schedule entry (identified by
     * channel, Unix-date, and start-time) and notify the device.
     *
     * @param {Suspension} item - Entry to suspend/unsuspend.
     * @param {boolean} add - `true` to add the suspension, `false` to remove it.
     */
    const sendSuspend = useCallback((item: Suspension, add: boolean) => {
        setSuspensions(prev => {
            let next: Suspension[];
            if (add) {
                next = [...prev, item];
            } else {
                next = prev.filter(s => !(s.ch === item.ch && s.date === item.date && s.startTime === item.startTime));
            }
            return next;
        });
        const msg = {
            command: 'sprinkler',
            data: { code: SendCodes.UPDATE_SUSPEND, item, add: add ? 1 : 0 },
        };
        sendMessage(JSON.stringify(msg));
    }, [sendMessage]);

    /**
     * Check whether a specific schedule entry is currently suspended.
     *
     * @param {number} ch        - Channel index.
     * @param {number} date      - Unix timestamp (seconds) for the calendar date.
     * @param {number} startTime - Start time in minutes from midnight.
     * @returns {boolean}
     */
    const isSuspended = useCallback((ch: number, date: number, startTime: number): boolean => {
        return suspensions.some(s => s.ch === ch && s.date === date && s.startTime === startTime);
    }, [suspensions]);

    // ── Outbound: manual ─────────────────────────────────────────────────────

    /**
     * Send a command to turn a channel on for a given duration.
     *
     * @param {number} channel       - Channel index (0 = pump, 1–6 = zones).
     * @param {number} [duration=10] - Run duration in minutes.
     */
    const turnOnChannel = useCallback((channel: number, duration = 10) => {
        sendMessage(JSON.stringify({
            command: 'sprinkler',
            data: { code: SendCodes.UPDATE_ITEMS, changes: { channel: [channel], day: [-1], item: 2, value: duration } },
        }));
    }, [sendMessage]);

    /**
     * Send a command to turn a channel off immediately.
     *
     * @param {number} channel - Channel index.
     */
    const turnOffChannel = useCallback((channel: number) => {
        sendMessage(JSON.stringify({
            command: 'sprinkler',
            data: { code: SendCodes.UPDATE_ITEMS, changes: { channel: [channel], day: [-1], item: 2, value: 0 } },
        }));
    }, [sendMessage]);

    return (
        <SprinklerContext.Provider value={{
            schedule, variables, name, channelActive, dataLoaded,
            rules, suspensions, acknowledged, rulesError, readyState,
            addRule, saveRule, deleteRule,
            sendSuspend, isSuspended,
            turnOnChannel, turnOffChannel,
            reload: loadData,
        }}>
            {children}
        </SprinklerContext.Provider>
    );
}

/**
 * Hook to access sprinkler state and actions from any child component.
 *
 * @returns {SprinklerContextValue}
 *
 * @example
 * const { rules, addRule, channelActive } = useSprinkler();
 */
export function useSprinkler(): SprinklerContextValue {
    const ctx = useContext(SprinklerContext);
    if (!ctx) throw new Error('useSprinkler must be used inside SprinklerProvider');
    return ctx;
}
