import { Stack } from 'expo-router';
import { WssProvider } from '../contexts/WssContext';
import { SprinklerProvider } from '../contexts/SprinklerContext';

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
