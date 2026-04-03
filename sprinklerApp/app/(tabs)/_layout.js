import { Tabs } from 'expo-router';
import { COLORS } from '../../constants';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

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
