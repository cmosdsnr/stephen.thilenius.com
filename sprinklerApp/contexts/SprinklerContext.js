import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useWss } from './WssContext';
import { SERVER_URL, Codes, SendCodes, NUM_CHANNELS, NUM_DAYS } from '../constants/sprinkler';

const SprinklerContext = createContext(null);

function splitScheduleIntoBlocks(schedule) {
    const byDay = Array.from({ length: NUM_DAYS }, () => []);

    for (const entry of schedule) {
        if (entry?.day < 0 || entry?.day >= NUM_DAYS) continue;
        byDay[entry.day].push(entry);
    }

    return byDay.flatMap((entries, day) => {
        const sorted = [...entries].sort((left, right) => {
            if (left.start !== right.start) return left.start - right.start;
            return left.ch - right.ch;
        });

        const blocks = [];
        let current = null;

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

            current.durations[entry.ch] = entry.duration;
            current.lastChannel = entry.ch;
            current.lastEnd = entry.start + entry.duration;
        }

        return blocks;
    });
}

function deriveRulesFromSchedule(schedule) {
    const groupedRules = new Map();

    for (const block of splitScheduleIntoBlocks(schedule)) {
        const signature = `${block.startTime}|${block.durations.join(',')}`;
        if (!groupedRules.has(signature)) {
            groupedRules.set(signature, {
                startTime: block.startTime,
                days: Array(NUM_DAYS).fill(false),
                durations: [...block.durations],
            });
        }
        groupedRules.get(signature).days[block.day] = true;
    }

    return [...groupedRules.values()]
        .sort((left, right) => {
            if (left.startTime !== right.startTime) return left.startTime - right.startTime;
            return left.durations.join(',').localeCompare(right.durations.join(','));
        })
        .map((rule, index) => ({ ...rule, id: index + 1 }));
}

export function SprinklerProvider({ children }) {
    const { sprinklerMessages, popSprinklerMessage, sendMessage, readyState } = useWss();

    const [schedule, setSchedule] = useState([]);
    const [variables, setVariables] = useState({});
    const [name, setName] = useState('');
    const [channelActive, setChannelActive] = useState(-1);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [rules, setRules] = useState([]);
    const [suspensions, setSuspensions] = useState([]);
    const [rulesError, setRulesError] = useState(false);
    const [acknowledged, setAcknowledged] = useState(true);
    const ackTimerRef = useRef(null);
    const nextRuleId = useRef(1);

    // ── HTTP initial load ────────────────────────────────────────────────────

    const loadData = useCallback(() => {
        fetch(`${SERVER_URL}/api/sprinkler/load`)
            .then(r => r.json())
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
                setVariables(prev => ({ ...prev, ...data.variable }));
                break;
            case Codes.ON_OFF:
                setChannelActive(data.on === 1 ? data.channel : -1);
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

    const sendRulesToESP = useCallback((r) => {
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
                    days: rule.days.reduce((acc, on, i) => on ? acc | (1 << i) : acc, 0),
                })),
            },
        };
        sendMessage(JSON.stringify(msg));
    }, [sendMessage]);

    // ── Rules CRUD ───────────────────────────────────────────────────────────

    const addRule = useCallback((rule) => {
        const newRule = { ...rule, id: nextRuleId.current++ };
        setRules(prev => {
            const next = [...prev, newRule];
            sendRulesToESP(next);
            return next;
        });
    }, [sendRulesToESP]);

    const saveRule = useCallback((rule) => {
        setRules(prev => {
            const next = prev.map(r => r.id === rule.id ? rule : r);
            sendRulesToESP(next);
            return next;
        });
    }, [sendRulesToESP]);

    const deleteRule = useCallback((id) => {
        setRules(prev => {
            const next = prev.filter(r => r.id !== id);
            sendRulesToESP(next);
            return next;
        });
    }, [sendRulesToESP]);

    // ── Outbound: suspend ────────────────────────────────────────────────────

    const sendSuspend = useCallback((item, add) => {
        setSuspensions(prev => {
            let next;
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

    const isSuspended = useCallback((ch, date, startTime) => {
        return suspensions.some(s => s.ch === ch && s.date === date && s.startTime === startTime);
    }, [suspensions]);

    // ── Outbound: manual ─────────────────────────────────────────────────────

    const turnOnChannel = useCallback((channel, duration = 10) => {
        sendMessage(JSON.stringify({
            command: 'sprinkler',
            data: { code: SendCodes.UPDATE_ITEMS, changes: { channel: [channel], day: [-1], item: 2, value: duration } },
        }));
    }, [sendMessage]);

    const turnOffChannel = useCallback((channel) => {
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

export function useSprinkler() {
    return useContext(SprinklerContext);
}
