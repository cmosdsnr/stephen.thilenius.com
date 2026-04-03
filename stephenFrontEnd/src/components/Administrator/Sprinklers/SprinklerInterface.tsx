import { useState, useEffect, useRef } from 'react';
import { Codes, itemNames, dataPoint, NUM_CHANNELS, NUM_DAYS, SendSocketCodes } from './constants';
import { useWss } from '../../../contexts/WssContext';
import { serverURL } from '../../../constants'
import { useInterval } from '../../../hooks/useInterval';

/**
 * Represents a single data point for a sprinkler channel.
 * Format: [duration, enabled, active, startTime]
 */
type DataPoint = [number, number, number, number];  // duration, enabled, active, startTime

/**
 * Represents a collection of data points for a single channel across multiple days.
 */
type Channel = DataPoint[];

/**
 * Represents the collection of all channels.
 */
type AllChannels = Channel[];

/**
 * Represents suspension configuration for a channel.
 * Format: [suspension1, suspension2, suspension3]
 */
type ChannelSuspensions = [number, number, number];

/**
 * Represents suspension configurations for all channels.
 */
type Suspensions = ChannelSuspensions[];

/**
 * Represents the data structure of messages received from the sprinkler server.
 */
type MessageItem = {
    channel: number[];
    day: number[];
    item: number;
    value: number;

};



type MessageData = {
    code: number;
    changes: MessageItem;
    variable: { [key: string]: number };
    channelData: AllChannels;
    nextWatering: string[];
    name: string;
    suspend: Suspensions;
    status: number;
    start: number;
    duration: number;
    channel: number;
    on: number;
}

type Variables = {
    localTime?: number;
    epoch?: number;
    boundary?: number;
    daysSinceBoundary?: number;
    dayStart?: number;
};


type ScheduleEntry = { day: number; ch: number; duration: number; start: number };

type DerivedRule = {
    id: number;
    startTime: number;
    days: boolean[];
    durations: number[];
};

function splitScheduleIntoBlocks(schedule: ScheduleEntry[]) {
    const byDay: ScheduleEntry[][] = Array.from({ length: NUM_DAYS }, () => []);

    for (const entry of schedule) {
        if (entry?.day < 0 || entry?.day >= NUM_DAYS) continue;
        byDay[entry.day].push(entry);
    }

    return byDay.flatMap((entries, day) => {
        const sorted = [...entries].sort((a, b) =>
            a.start !== b.start ? a.start - b.start : a.ch - b.ch
        );

        const blocks: { day: number; startTime: number; durations: number[]; lastChannel: number; lastEnd: number }[] = [];
        let current: (typeof blocks)[0] | null = null;

        for (const entry of sorted) {
            const startsNewBlock = !current
                || entry.ch <= current.lastChannel
                || entry.start !== current.lastEnd;

            if (startsNewBlock) {
                current = { day, startTime: entry.start, durations: Array(NUM_CHANNELS).fill(0), lastChannel: -1, lastEnd: entry.start };
                blocks.push(current);
            }

            current!.durations[entry.ch] = entry.duration;
            current!.lastChannel = entry.ch;
            current!.lastEnd = entry.start + entry.duration;
        }

        return blocks;
    });
}

function deriveRulesFromSchedule(schedule: ScheduleEntry[]): DerivedRule[] {
    const groupedRules = new Map<string, { startTime: number; days: boolean[]; durations: number[] }>();

    for (const block of splitScheduleIntoBlocks(schedule)) {
        const signature = `${block.startTime}|${block.durations.join(',')}`;
        if (!groupedRules.has(signature)) {
            groupedRules.set(signature, { startTime: block.startTime, days: Array(NUM_DAYS).fill(false), durations: [...block.durations] });
        }
        groupedRules.get(signature)!.days[block.day] = true;
    }

    return [...groupedRules.values()]
        .sort((a, b) => a.startTime !== b.startTime ? a.startTime - b.startTime : a.durations.join(',').localeCompare(b.durations.join(',')))
        .map((rule, index) => ({ ...rule, id: index + 1 }));
}

/**
 * Pauses execution for a specified number of seconds.
 * @param seconds - The number of seconds to sleep.
 */
async function sleepSeconds(seconds: number) {
    await new Promise((res) => setTimeout(res, seconds * 1000));
}

/**
 * Checks if the sprinkler WebSocket service is connected.
 * @returns A promise that resolves to true if connected, false otherwise.
 */
// see if sprinkler wss is connected
async function checkConnection() {
    const url = new URL('/api/sprinkler/isConnected', serverURL);
    const response = await fetch(url.toString());
    const data = await response.json();
    return (data.connected != -1);
}

/**
 * Checks the status of the ESP32 connection.
 * @returns A promise that resolves to the status of the ESP.
 */
async function checkESP() {
    const url = new URL('/api/sprinkler/found', serverURL);
    const response = await fetch(url.toString());
    const data = await response.json();
    return data.status;
}

/**
 * Custom hook to monitor the connection status to the sprinkler service.
 * Retries connection every 20 seconds until connected.
 * @returns boolean indicating if the service is connected.
 */
function useConnectionCheck() {
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        (async () => {
            while (!checkConnection()) {
                await sleepSeconds(20);
            }
            setConnected(true);
        })();
    }, []);

    return connected;
}


/**
 * Main hook for interacting with the Sprinkler system.
 * Manages state for channels, schedules, variables, and WebSocket communication.
 * Provides functions to update and control the sprinkler system.
 * 
 * @returns An object containing sprinkler data and control functions.
 */
export const SprinklerInterface = () => {

    const [variables, setVariables] = useState<{ [key: string]: number }>({});
    const [rules, setRules] = useState<DerivedRule[]>([]);
    const [channelData, setChannelData] = useState<AllChannels>([]);
    const [channelActive, setChannelActive] = useState<number>(-1);
    const [suspensions, setSuspensions] = useState<Suspensions>([]);
    const [name, setName] = useState<string>('');
    const [nextWatering, setNextWatering] = useState<string[]>([]);
    const [numberOfChannels, setNumberOfChannels] = useState(0);
    const [numberOfDays, setNumberOfDays] = useState(0);
    const [displayTime, setDisplayTime] = useState("")
    const [manual, setManual] = useState<number>(-1);
    const [acknowledged, setAcknowledged] = useState<boolean>(true);
    const [rulesError, setRulesError] = useState<boolean>(false);
    const ackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dow = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    const { sprinklerMessages, popSprinklerMessage, subscribe, unsubscribe, sendMessage, readyState } = useWss();

    const sprinklerConnected = useConnectionCheck();
    const [sprinklerDataLoaded, setSprinklerDataLoaded] = useState<boolean>(false);


    /**
     * Fetches the initial sprinkler data from the server.
     * Updates all local state variables with the received configuration,
     * including variables, channel data, suspensions, global settings, and next watering times.
     */
    const fetchSprinklerData = () => {
        const url = new URL('/api/sprinkler/load', serverURL);
        fetch(url.toString())
            .then(response => response.json())
            .then(data => {
                if (data.error)
                    console.log(data.error);
                else {
                    console.log('sprinkler data fetched:' + JSON.stringify(data));
                    setSprinklerDataLoaded(true);
                    setVariables(data.variables);
                    setNumberOfChannels(NUM_CHANNELS);
                    setNumberOfDays(NUM_DAYS);
                    setName(data.name);
                    setManual(-1);
                    setChannelActive(data.runningChannel ?? -1);
                    setRules(deriveRulesFromSchedule(data.schedule ?? []));
                }
            });
    };

    /**
     * Effect to reload data when the sprinkler connection is established.
     */
    useEffect(() => {
        if (sprinklerConnected) {
            fetchSprinklerData();
        }
    }, [sprinklerConnected]);

    /**
     * Effect to initialize data and subscribe to sprinkler messages on mount.
     * Unsubscribes on unmount.
     */
    useEffect(() => {
        subscribe("sprinkler");
        return () => unsubscribe("sprinkler");
    }, []);

    /**
     * Interval hook to update the local clock every second.
     * Calculates display time including the day of the week relative to the watering boundary.
     */
    useInterval(function () {
        if (!variables.epoch || !variables.daysSinceBoundary) return;
        setVariables(prev => { if (prev.epoch) prev.epoch++; return prev; });
        const t = new Date(variables.epoch * 1000);
        setDisplayTime(
            t.toLocaleString() +
            ((variables.daysSinceBoundary > 6) ? " (second " : " (first ") +
            dow[variables.daysSinceBoundary % 7] + ")"
        );
    }, 1000)

    /**
     * Handles incoming WebSocket messages from the sprinkler system.
     * Updates local state based on message codes (e.g., channel updates, variable changes).
     * @param data - The message data received from the server.
     */
    function onMessage(data: MessageData) {
        // console.log('on Message');

        if (data.code < Codes.UPDATE_ITEMS) return; // not a message for this interface (for ESP <--> ESP server site)

        const ch = [...channelData];
        let chSeen = false;

        // let t: keyof MessageData;
        let str: string = "received code:" + data.code
        console.log('received message: ', data);
        switch (data.code) {
            case Codes.UPDATE_ITEMS:
                {
                    const change = data.changes;
                    const channels = change.channel;
                    const days = change.day;

                    let activeChanged = false;

                    for (const c of channels) {
                        for (const d of days) {
                            str += " item:" + Object.keys(itemNames)[change.item] + " channel:" + c + " day:" + d + " value:" + change.value + "\n";
                            if (change.item == itemNames.ACTIVE) {
                                activeChanged = true;
                                if (manual >= 0 && change.value === 0) {
                                    console.log('manual expiration');
                                    setManual(-1);
                                }
                                if (d >= 0) {
                                    ch[c][d][change.item] = change.value;
                                    chSeen = true;
                                }
                            }
                        }
                    }
                    // if (activeChanged) setChannelActive(change.value === 1 ? channels[0] : -1);
                    if (chSeen) setChannelData(ch);
                }
                break;
            case Codes.UPDATE_VARIABLES:
                setVariables(prev => ({ ...prev, ...data.variable }));
                for (const key in data.variable) {
                    str += `${key} set to: ${data.variable[key]}\n`;
                }
                break;
            case Codes.UPDATE_EVENT:
                // console.log('update event: ', JSON.stringify(data));
                // ignore
                break;
            case Codes.UPDATE_NEXT_WATERING:
                console.log('next watering: ', JSON.stringify(data));
                // ignore
                break;
            case Codes.ACKNOWLEDGE_RULES:
                console.log('rules acknowledged: ', JSON.stringify(data));
                if (ackTimerRef.current) {
                    clearTimeout(ackTimerRef.current);
                    ackTimerRef.current = null;
                }
                setAcknowledged(true);
                setRulesError(false);
                break;
            case Codes.ACKNOWLEDGE_SUSPEND:
                console.log('suspend acknowledged: ', JSON.stringify(data));
                break;
            case Codes.ON_OFF:
                console.log('ch ' + data.channel + ' turned ' + (data.on === 1 ? 'on' : 'off'));
                setChannelActive(data.on === 1 ? data.channel : -1)
                break;
            default:
                console.log('unknown code: ', data.code);
                break;
        }
        console.log(str);
    }

    /**
     * Effect to process incoming messages from the queue.
     * Processes one message at a time when the message queue updates.
     */
    useEffect(() => {
        if (sprinklerMessages.length > 0) {
            onMessage(sprinklerMessages[0]);
            popSprinklerMessage();
        }
    }, [sprinklerMessages]);


    /**
     * Updates a specific property for a channel on a specific day.
     * @param changes - The message item to update.
     */
    function update(changes: MessageItem) {
        const data = {
            command: 'sprinkler',
            data: {
                code: SendSocketCodes.UPDATE_ITEMS,
                changes
            }
        }
        sendMessage(JSON.stringify(data));
        console.log("sending message: ", JSON.stringify(data));
    }

    function sendSuspend(item: { date: number; startTime: number; ch: number }, add: boolean) {
        const data = {
            command: 'sprinkler',
            data: {
                code: SendSocketCodes.UPDATE_SUSPEND,
                item,
                add: add ? 1 : 0,
            }
        }
        sendMessage(JSON.stringify(data));
        console.log("sending message: ", JSON.stringify(data));
    }

    function sendRules(rules: { id: number; days: boolean[]; startTime: number; durations: number[] }[]) {
        if (ackTimerRef.current) clearTimeout(ackTimerRef.current);
        setAcknowledged(false);
        setRulesError(false);
        ackTimerRef.current = setTimeout(() => {
            setAcknowledged(prev => {
                if (!prev) setRulesError(true);
                return prev;
            });
            ackTimerRef.current = null;
        }, 30_000);
        const data = {
            command: 'sprinkler',
            data: {
                code: SendSocketCodes.UPDATE_RULES,
                rules: rules.map(r => ({
                    ...r,
                    days: r.days.reduce((acc, on, i) => on ? acc | (1 << i) : acc, 0),
                })),
            }
        }
        sendMessage(JSON.stringify(data));
        console.log("sending message: ", JSON.stringify(data));
    }

    /**
     * Requests all sprinkler data from the server.
     */
    function request() {
        const data = {
            command: 'sprinkler',
            data: {
                code: SendSocketCodes.REQUEST_ALL_DATA,
            }
        }
        sendMessage(JSON.stringify(data));
        console.log("sending message: ", JSON.stringify(data));
    }


    /**
     * Sends a command to sequence channels for a specific day so they don't overlap.
     * @param day - The day index to sequence.
     */
    const compactDay = (day: number) => {
        const ch = [...channelData];
        // Cannot batch this as each channel has a different start time
        let startTime = ch[0][day][itemNames.STARTTIME] + ch[0][day][itemNames.DURATION];
        for (let c = 1; c < ch.length; c++) {
            ch[c][day][itemNames.STARTTIME] = startTime;
            startTime += ch[c][day][itemNames.DURATION];
            update({
                channel: [c],
                day: [day],
                item: itemNames.STARTTIME,
                value: ch[c][day][itemNames.STARTTIME],
            });
        }
    }

    /**
     * Manually turns on a specific channel for a specified duration.
     * @param channel - The channel index.
     * @param duration - The duration in minutes (default 10).
     */
    function turnOnChannel(channel: number, duration: number = 10) {
        update({
            channel: [channel],
            day: [-1],
            item: itemNames.ACTIVE,
            value: duration,
        });
    }

    /**
     * Manually turns off a specific channel.
     * @param channel - The channel index.
     */
    function turnOffChannel(channel: number) {
        update({
            channel: [channel],
            day: [-1],
            item: itemNames.ACTIVE,
            value: 0,
        });
    }



    return {
        readyState,          // WebSocket ready state
        channelData,         // Data for all channels
        update,              // Function to update channel data
        request,             // Function to request all data
        sendRules,           // Function to send all rules to the ESP
        sendSuspend,         // Function to send suspend list to the ESP
        compactDay,      // Function to compact channel data
        turnOnChannel,       // Function to manually turn on a channel
        turnOffChannel,      // Function to manually turn off a channel
        numberOfChannels,    // Number of channels available
        numberOfDays,        // Number of days managed
        variables,           // System variables
        suspensions,         // Suspension settings
        nextWatering,        // Next scheduled watering times
        name,                // System name
        displayTime,         // Current display time string
        channelActive,       // Active status of channels
        manual,              // Manual override index (-1 if none)
        sprinklerDataLoaded, // Boolean indicating if data is loaded
        rulesError,          // True if ESP did not acknowledge rules within 30s
        rules,               // Derived rules from schedule
        setRules,            // Update rules locally (call sendRules separately to persist)
    };
};