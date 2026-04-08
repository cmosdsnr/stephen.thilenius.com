/**
 * @module app/_layout
 * @description Root Expo Router layout.
 *
 * Wraps the entire navigation tree with the two application context providers:
 * 1. {@link module:WssContext.WssProvider} — establishes and maintains the
 *    WebSocket connection.
 * 2. {@link module:SprinklerContext.SprinklerProvider} — loads schedule data
 *    and owns all sprinkler state.
 *
 * Registers two named screens:
 * - `(tabs)` — the main tab navigator (header hidden; tabs own their headers).
 * - `specificEdit` — modal-style stack screen for editing a specific
 *   day/channel schedule entry.
 */

import { Stack } from 'expo-router';
import { WssProvider } from '../contexts/WssContext';
import { SprinklerProvider } from '../contexts/SprinklerContext';

/**
 * Root layout component. Rendered once for the lifetime of the app.
 *
 * @returns {React.ReactElement}
 */
export default function RootLayout() {
    return (
        <WssProvider>
            <SprinklerProvider>
                <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="specificEdit" options={{ headerBackTitle: 'Back' }} />
                </Stack>
            </SprinklerProvider>
        </WssProvider>
    );
}
