/**
 * @module WssContext
 * @description WebSocket connection context for the sprinkler app.
 *
 * Maintains a persistent WebSocket connection to the backend relay server,
 * with automatic reconnection on close and a 58-second ping/pong keepalive to
 * prevent idle timeouts. On connection, subscribes to the `'sprinkler'` topic
 * so the server forwards device messages to this client.
 *
 * Inbound messages are routed:
 * - `{ command: 'ping' }` → immediately replies with a pong.
 * - `{ command: 'pong' }` → silently discarded.
 * - `{ command: 'sprinkler', ... }` → appended to the `sprinklerMessages` queue
 *   for consumption by {@link module:SprinklerContext}.
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { WSS_URL } from '../constants/sprinkler';

export interface SprinklerMessage extends Record<string, unknown> {
    command: string;
    code?: number;
}

interface WssContextValue {
    readyState: number;
    sprinklerMessages: SprinklerMessage[];
    popSprinklerMessage: () => void;
    sendMessage: (msg: string) => void;
}

const WssContext = createContext<WssContextValue | null>(null);

/**
 * Context provider that owns the WebSocket lifecycle.
 * Wrap the application root with this component (inside `app/_layout.tsx`) so
 * that all screens share a single connection.
 *
 * @param {{ children: React.ReactNode }} props
 * @returns {React.ReactElement}
 */
export function WssProvider({ children }: { children: React.ReactNode }): React.ReactElement {
    const wsRef = useRef<WebSocket | null>(null);
    const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);
    const [sprinklerMessages, setSprinklerMessages] = useState<SprinklerMessage[]>([]);
    const subscribedRef = useRef(false);
    const pingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * Send a raw string message over the WebSocket, if the connection is open.
     *
     * @param {string} msg - JSON-serialised message string.
     */
    const sendMessage = useCallback((msg: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(msg);
        }
    }, []);

    /**
     * Remove the first item from the `sprinklerMessages` queue.
     * Called by {@link module:SprinklerContext} after processing each message.
     */
    const popSprinklerMessage = useCallback(() => {
        setSprinklerMessages(prev => prev.slice(1));
    }, []);

    /**
     * Restart the 58-second ping timer.
     * A ping is sent if no message arrives within the window, keeping the
     * connection alive through load balancers and mobile NAT gateways.
     */
    const resetPingTimer = useCallback(() => {
        if (pingTimerRef.current) clearTimeout(pingTimerRef.current);
        pingTimerRef.current = setTimeout(() => {
            sendMessage(JSON.stringify({ command: 'ping' }));
        }, 58000);
    }, [sendMessage]);

    useEffect(() => {
        function connect() {
            const ws = new WebSocket(WSS_URL);
            wsRef.current = ws;
            setReadyState(WebSocket.CONNECTING);

            ws.onopen = () => {
                setReadyState(WebSocket.OPEN);
                subscribedRef.current = false;
                ws.send(JSON.stringify({ command: 'subscribe', topic: 'sprinkler' }));
                subscribedRef.current = true;
                resetPingTimer();
            };

            ws.onmessage = (event: MessageEvent) => {
                resetPingTimer();
                try {
                    const data = JSON.parse(event.data as string) as SprinklerMessage;
                    if (data.command === 'ping') {
                        sendMessage(JSON.stringify({ command: 'pong' }));
                        return;
                    }
                    if (data.command === 'pong') return;
                    if (data.command === 'sprinkler') {
                        setSprinklerMessages(prev => [...prev, data]);
                    }
                } catch (e) {
                    console.warn('WssContext: failed to parse message', e);
                }
            };

            ws.onerror = (e: Event) => {
                console.warn('WssContext: WebSocket error', e);
            };

            ws.onclose = () => {
                setReadyState(WebSocket.CLOSED);
                // Reconnect after 3 seconds
                setTimeout(connect, 3000);
            };
        }

        connect();

        return () => {
            if (pingTimerRef.current) clearTimeout(pingTimerRef.current);
            wsRef.current?.close();
        };
    }, []);

    return (
        <WssContext.Provider value={{ readyState, sprinklerMessages, popSprinklerMessage, sendMessage }}>
            {children}
        </WssContext.Provider>
    );
}

/**
 * Hook to access the WebSocket context from any child component.
 *
 * @returns {WssContextValue}
 *
 * @example
 * const { sendMessage, readyState } = useWss();
 */
export function useWss(): WssContextValue {
    const ctx = useContext(WssContext);
    if (!ctx) throw new Error('useWss must be used inside WssProvider');
    return ctx;
}
