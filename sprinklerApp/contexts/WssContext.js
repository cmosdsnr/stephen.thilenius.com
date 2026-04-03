import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { WSS_URL } from '../constants/sprinkler';

const WssContext = createContext(null);

export function WssProvider({ children }) {
    const wsRef = useRef(null);
    const [readyState, setReadyState] = useState(WebSocket.CONNECTING);
    const [sprinklerMessages, setSprinklerMessages] = useState([]);
    const subscribedRef = useRef(false);
    const pingTimerRef = useRef(null);

    const sendMessage = useCallback((msg) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(msg);
        }
    }, []);

    const popSprinklerMessage = useCallback(() => {
        setSprinklerMessages(prev => prev.slice(1));
    }, []);

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

            ws.onmessage = (event) => {
                resetPingTimer();
                try {
                    const data = JSON.parse(event.data);
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

            ws.onerror = (e) => {
                console.warn('WssContext: WebSocket error', e.message);
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

export function useWss() {
    return useContext(WssContext);
}
