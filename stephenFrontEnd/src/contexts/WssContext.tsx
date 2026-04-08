import React, { useState, useEffect, useRef, useContext, createContext } from 'react'
import useWebSocket from 'react-use-websocket';
import { socketURL } from '../constants'
import { API } from '../api'
import { useInterval } from '../hooks/useInterval';
import { DateTime } from 'luxon';


/** React context that exposes the shared WebSocket interface to the rest of the app. */
const WebsocketContext = createContext({} as SocketContextType);

/** Hook for any component to consume the WebSocket context. */
export function useWss() {
    return useContext(WebsocketContext)
}

export type params = {
    children: any;
};

/**
 * Provides a single shared WebSocket connection to the server for the entire app.
 * Responsibilities:
 *  - Automatic reconnection on close (shouldReconnect: always true)
 *  - Keep-alive pings every ~58 s to prevent idle disconnection
 *  - Watchdog timer: reloads the page if no ping arrives within 5 minutes
 *    (guards against a silently stale/zombie connection)
 *  - Topic-based pub/sub: components call subscribe(topic) / unsubscribe(topic);
 *    the provider sends the corresponding server commands and replays subscriptions
 *    automatically after reconnect
 *  - Routes incoming messages to the correct state slice by command name
 */
export function WssProvider({ children }: params) {
    /** True once the socket reaches OPEN state. */
    const [isReady, setIsReady] = useState(false)
    /** Timestamp (ms) of the last ultimeter scalar update received from the server. */
    const [ultimeterLastUpdate, setUltimeterLastUpdate] = useState(0)
    /** Latest [power, timestamp] pair pushed by the solar-edge feed. */
    const [solarEdgeUpdate, setSolarEdgeUpdate] = useState<UpdateSolarPair | null>(null)
    /** Latest [speed, duration, timestamp] triple pushed by the ultimeter feed. */
    const [ultimeterUpdate, setUltimeterUpdate] = useState<UpdateDataPair | null>(null)
    /** Queue of raw sprinkler messages waiting to be processed by SprinklerInterface. */
    const [sprinklerMessages, setSprinklerMessages] = useState<SprinklerMessage[]>([])
    /** Map of known ESP devices: name → { date, ip, elapsed }. */
    const [ESPlist, setESPlist] = useState<ESPlist>({})
    /** Handle for the keep-alive interval so it can be cleared on socket close. */
    const [timer, setTimer] = useState<NodeJS.Timeout>();
    /** Tracks the last time any message was sent — used to decide when to send a keep-alive ping. */
    const lastSent = useRef(Date.now());
    /** Set of topics this client is currently subscribed to. */
    const [mySubs, setMySubs] = useState<Set<String>>(new Set());
    /** Timestamp (ms) of the last ping received — used by the watchdog to detect a dead connection. */
    const [lastPing, setLastPing] = useState<number>(Date.now());

    /**
     * Removes the oldest message from the sprinkler queue.
     * Called by SprinklerInterface after it finishes processing each message.
     */
    const popSprinklerMessage = () => {
        const d = [...sprinklerMessages];
        d.pop();
        setSprinklerMessages(d);
    }

    const { sendMessage,
        sendJsonMessage,  // (data: any)    => void,
        lastMessage,
        readyState,
        getWebSocket } =
        useWebSocket(socketURL, {
            onOpen: () => {
                console.log(`socket to ${socketURL} opened at ${new Date().toLocaleTimeString()}`);
                setLastPing(Date.now());
                // Keep-alive: if no message has been sent in 58 s, send a ping.
                // This prevents the server or any intermediate proxy from closing an idle connection.
                setTimer(setInterval(() => {
                    // console.log(`last sent ${lastSent.current.toLocaleTimeString()}`);
                    let dt = Date.now() - lastSent.current;
                    if (dt >= 58000) {
                        wsSendJsonMessage({ command: "ping" });
                        // console.log(`sending ping at ${new Date().toLocaleTimeString()}`);
                    }
                }, 59000));

            },
            onClose: () => {
                console.log(`socket to ${socketURL} closed at ${new Date().toLocaleTimeString()}`)
                clearInterval(timer);
            },
            onMessage: (d) => {
                const message = JSON.parse(d.data);
                // console.log("message:" + message);
                if (message.command) {
                    if (message.command.includes("subscribed")) {
                        // Server echoes a "subscribed to <topic>" confirmation — just log it.
                        console.log(message.command);
                    }
                    else
                        switch (message.command) {
                            case "ultimeter":
                                // Array payload = full data pair; scalar = last-update timestamp only.
                                if (Array.isArray(message.data))
                                    setUltimeterUpdate(message.data);
                                else
                                    setUltimeterLastUpdate(message.data);
                                break;
                            case "solar":
                                setSolarEdgeUpdate(message.data);
                                // debugger;
                                break;
                            case "ESPlist":
                                // Merge the new device entry into the existing map.
                                const e = { ...ESPlist };
                                e[message.data.name] = { date: new Date(message.data.date), ip: message.data.ip, elapsed: "00:00" };
                                setESPlist(e)
                                break;
                            case "sprinkler":
                                // Push onto the queue; SprinklerInterface drains it one message at a time.
                                const d = [...sprinklerMessages];
                                d.push(message);
                                setSprinklerMessages(d);
                                break;
                            case "pong":
                                // console.log(`received pong at ${new Date().toLocaleTimeString()}`);
                                break;
                            case 'ping': {
                                // Server-initiated ping — reply immediately and record the timestamp.
                                sendJsonMessage({ command: "pong" });
                                setLastPing(Date.now());
                                break;
                            }
                            default:
                                console.log("Unknown message")
                                console.log(message)
                        }
                }
            },
            //Will attempt to reconnect on all close events, such as server shutting down
            shouldReconnect: (_closeEvent) => true,

        });

    useEffect(() => {
        if (lastMessage !== null) {
            // console.log(lastMessage)
        }
    }, [lastMessage]);

    /**
     * When the socket opens (or mySubs changes after a reconnect), re-send subscribe
     * commands for all active topics so the server resumes pushing their messages.
     * mySubs is included in the dependency array so a new subscription added while
     * the socket is already open also gets sent immediately.
     */
    useEffect(() => {
        // console.log(`readyState: ${readyState}`);
        if (readyState === WebSocket.OPEN) {
            mySubs.forEach(sub => wsSendJsonMessage({ command: "subscribe", topic: sub }));
            setIsReady(true);
        } else {
            setIsReady(false);
        }
    }, [readyState, mySubs]); // include mySubs so reconnect after new subs resends correctly


    /**
     * Calculates elapsed time since each ESP device was last seen and writes it back
     * into the list entry as a formatted string (e.g. "1 days 0:02:35").
     * Mutates the list in-place — callers are responsible for passing a shallow copy.
     */
    const updateElapsed = (list: ESPlist) => {
        Object.keys(list).map((a) => {
            let e = Math.round((Date.now() - list[a].date.getTime()) / 1000);
            const s = e % 60;
            e = Math.floor(e / 60);
            const m = e % 60;
            e = Math.floor(e / 60);
            const h = e % 24;
            const d = Math.floor(e / 24);

            list[a].elapsed = "";
            if (d > 0) list[a].elapsed += `${d} days `;
            list[a].elapsed += `${h}:`;
            if (m < 10) list[a].elapsed += `0`;
            list[a].elapsed += `${m}:`;
            if (s < 10) list[a].elapsed += `0`;
            list[a].elapsed += `${s}`;
        })
    }

    /** Ticks every second to keep elapsed-time strings on ESPlist entries current. */
    useInterval(() => {
        if (Object.keys(ESPlist).length == 0) return;
        const list = { ...ESPlist };
        updateElapsed(list);
        setESPlist(list);
        // console.log("updating elapsed");
    }, 1000);

    /**
     * Watchdog: checks every minute whether a ping has been received recently.
     * If the page is visible and no ping arrived in the last 5 minutes, the connection
     * is assumed to be silently dead and the page is reloaded to recover.
     */
    useInterval(() => {
        const now = Date.now();
        if (document.visibilityState === 'visible' && (now - lastPing > 1000 * 60 * 5)) {
            console.error(
                "LATE PING watchdog triggered at",
                DateTime.fromMillis(now).toLocaleString(DateTime.DATETIME_SHORT),
                "last ping:",
                (now - lastPing) / 1000, "seconds ago"
            );
            window.location.reload();
        }
    }, 60_000);

    /** Full set of valid topics the server accepts subscriptions for. */
    const subscriptions: Set<Topic> = new Set(["ESPlist", "sprinkler", "pong", "solar", "powerMeter", "davis", "ultimeter"]);


    /** Wraps sendMessage, updating lastSent so the keep-alive logic stays accurate. */
    const wsSendMessage = (message: string) => {
        sendMessage(message);
        lastSent.current = Date.now();
    }

    /** Wraps sendJsonMessage, updating lastSent so the keep-alive logic stays accurate. */
    const wsSendJsonMessage = (data: any) => {
        sendJsonMessage(data);
        lastSent.current = Date.now();
    }

    /**
     * Subscribes this client to a server topic.
     * - Validates against the known topic list.
     * - Deduplicates: no-ops if already subscribed.
     * - Sends the subscribe command immediately if the socket is open; otherwise
     *   the readyState effect will replay it on the next (re)connect.
     * - For "ESPlist", also fetches the current device snapshot via HTTP to seed the UI.
     */
    const subscribe = (topic: Topic) => {
        if (!subscriptions.has(topic)) {
            console.log(`Unknown topic: ${topic}`);
            return;
        }

        // Only add if not already present
        setMySubs(prev => {
            if (prev.has(topic)) {
                console.log(`already subscribed to ${topic}`);
                return prev;
            }
            // send to server only when truly new AND socket is open
            if (readyState === WebSocket.OPEN) {
                wsSendJsonMessage({ command: "subscribe", topic });
                console.log(`subscribed to ${topic}`);
            }
            const next = new Set(prev);
            next.add(topic);
            return next;
        });

        if (topic === "ESPlist") {
            fetch(API.ESPlist())
                .then(r => r.json())
                .then(data => {
                    Object.keys(data).forEach((a: any) => (data[a].date = new Date(data[a].date)));
                    updateElapsed(data);
                    setESPlist(data);
                });
        }
    };


    /**
     * Unsubscribes this client from a server topic and notifies the server.
     * No-ops if the topic is unknown or not currently subscribed.
     */
    const unsubscribe = (topic: Topic) => {
        if (!subscriptions.has(topic)) {
            console.log(`Unknown topic: ${topic}`);
            return;
        }
        if (!mySubs.has(topic)) {
            console.log(`Not subscribed to: ${topic}`);
            return;
        }
        setMySubs(prev => {
            const next = new Set(prev);
            next.delete(topic);
            return next;
        });
        wsSendJsonMessage({ command: "unsubscribe", topic: topic })
        // if (topic === "ESPlist") setESPlist({});
        //clearInterval(elapseTimer);
    }



    const ret: SocketContextType = {
        isReady,
        readyState,
        ESPlist,
        sendMessage: wsSendMessage,
        sendJsonMessage: wsSendJsonMessage,
        subscribe,
        unsubscribe,
        solarEdgeUpdate,
        ultimeterUpdate,
        ultimeterLastUpdate,
        sprinklerMessages,
        popSprinklerMessage
    }

    return (
        <WebsocketContext.Provider value={ret}>
            {children}
        </WebsocketContext.Provider>
    )
}
