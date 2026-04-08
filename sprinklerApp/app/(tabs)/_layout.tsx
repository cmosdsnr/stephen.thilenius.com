/**
 * @module app/(tabs)/_layout
 * @description Tab navigator layout defining the five main application tabs.
 *
 * | Tab      | Screen file  | Icon              |
 * |----------|--------------|-------------------|
 * | Zones    | index.tsx    | water-drop        |
 * | Manual   | manual.tsx   | touch-app         |
 * | Rules    | rules.tsx    | rule              |
 * | Calendar | calendar.tsx | calendar-month    |
 * | System   | variables.tsx| settings          |
 *
 * All tabs share a common header styled with the primary brand color.
 */

import { Tabs } from 'expo-router';
import { COLORS } from '../../constants';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

/**
 * Tab navigator configuration. Each `Tabs.Screen` maps a file-system route
 * to a tab label and icon.
 *
 * @returns {React.ReactElement}
 */
export default function TabsLayout() {
    return (
        <Tabs screenOptions={{
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.gray,
            headerShown: true,
            headerStyle: { backgroundColor: COLORS.primary },
            headerTintColor: '#fff',
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Zones',
                    tabBarIcon: ({ color }) => <MaterialIcons name="water-drop" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="manual"
                options={{
                    title: 'Manual',
                    tabBarIcon: ({ color }) => <MaterialIcons name="touch-app" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="rules"
                options={{
                    title: 'Rules',
                    tabBarIcon: ({ color }) => <MaterialIcons name="rule" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="calendar"
                options={{
                    title: 'Calendar',
                    tabBarIcon: ({ color }) => <MaterialIcons name="calendar-month" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="variables"
                options={{
                    title: 'System',
                    tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}
