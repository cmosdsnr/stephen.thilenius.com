import { useEffect, useRef } from 'react';

/**
 * Hook signature for useInterval.
 * Takes a callback function and an interval in milliseconds.
 */
export interface IUseInterval {
    /**
     * Repeatedly invokes the provided callback with the specified delay.
     * 
     * @param callback - The function to call on every interval tick.
     * @param interval - The delay in milliseconds between calls. If 0 or less, the interval is disabled.
     */
    (callback: () => void, interval: number): void;
}

/**
 * Custom React hook that repeatedly calls a callback function at a specified interval.
 * 
 * - The interval is cleared and reset whenever the `interval` value changes.
 * - The latest version of the callback is used even if it changes after mount.
 * 
 * @param callback - The function to invoke repeatedly.
 * @param interval - The delay in milliseconds between each invocation. Use 0 or negative to disable.
 */
export const useInterval: IUseInterval = (callback, interval) => {
    const savedCallback = useRef<(() => void) | null>(null);

    // Save the latest callback reference after each render
    useEffect(() => {
        savedCallback.current = callback;
    });

    // Set up the interval
    useEffect(() => {
        function tick() {
            if (savedCallback.current) {
                savedCallback.current();
            }
        }

        if (interval > 0) {
            const id = setInterval(tick, interval);
            return () => clearInterval(id);
        } else {
            return () => { };
        }
    }, [interval]);
};
