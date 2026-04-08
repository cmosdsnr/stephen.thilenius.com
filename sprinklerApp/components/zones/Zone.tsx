/**
 * @module components/zones/Zone
 * @description Collapsible zone card showing the 14-day schedule grid for a
 * single channel and providing inline manual on/off controls.
 */

import { StyleSheet, Text, View, TouchableOpacity, Pressable, ViewStyle } from 'react-native';
import { useRef, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { COLORS, SIZES } from '../../constants';
import { DAY_LABELS } from '../../constants/sprinkler';
import { useSprinkler } from '../../contexts/SprinklerContext';

interface ZoneProps {
    channelIndex: number;
    label: string;
}

/**
 * Returns `true` if the channel has at least one schedule entry on `day`.
 *
 * @param {object[]} schedule     - Flat schedule entry array from context.
 * @param {number}   channelIndex - Channel to check.
 * @param {number}   day          - Cycle day index (0–13).
 * @returns {boolean}
 */
function isEnabled(schedule: { ch: number; day: number }[], channelIndex: number, day: number): boolean {
    return schedule.some(e => e.ch === channelIndex && e.day === day);
}

/**
 * Format a minutes-from-midnight value as a zero-padded `HH:MM` string.
 *
 * @param {number} minutes - Time value in minutes from midnight (0–1439).
 * @returns {string}
 */
function formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Dynamic style creators (cannot live inside StyleSheet.create)
const headerStyle = (open: boolean, running: boolean): ViewStyle => ({
    backgroundColor: running ? '#2a7a2a' : open ? COLORS.primary : COLORS.tertiary,
    padding: SIZES.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
});

const manualBtnStyle = (color: string): ViewStyle => ({
    flex: 1,
    backgroundColor: color,
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
});

const dayBtnStyle = (enabled: boolean): ViewStyle => ({
    flex: 1,
    backgroundColor: enabled ? '#c8f5c8' : '#f5c8c8',
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
});

/**
 * Collapsible card for a single irrigation channel.
 *
 * Tapping the header expands the card to reveal:
 * - **Manual controls**: Run 10 min / Stop buttons.
 * - **Day grid**: 7 rows × 2 columns (Week 1 | Week 2). Each cell shows
 *   the channel's enabled/disabled state for that cycle day and, when
 *   enabled, the start time and duration. Tapping a cell navigates to
 *   the `specificEdit` screen for detailed editing.
 *
 * @param {ZoneProps} props
 * @returns {React.ReactElement}
 */
const Zone = ({ channelIndex, label }: ZoneProps) => {
    const [showZone, setShowZone] = useState(false);
    const router = useRouter();
    const { schedule, dayMap, channelActive, turnOnChannel, turnOffChannel } = useSprinkler();

    const isRunning = channelActive === channelIndex;

    return (
        <View style={styles.zoneContainer}>
            {/* ── Header ── */}
            <Pressable style={headerStyle(showZone, isRunning)} onPress={() => setShowZone(v => !v)}>
                <Text style={styles.headerText}>{label}</Text>
                {isRunning && <Text style={styles.runningBadge}>RUNNING</Text>}
                <FontAwesome name={showZone ? 'chevron-up' : 'chevron-down'} size={16} color="#fff" />
            </Pressable>

            {showZone && (
                <View style={styles.body}>
                    {/* ── Manual on/off ── */}
                    <View style={styles.manualRow}>
                        <Pressable style={manualBtnStyle('green')} onPress={() => turnOnChannel(channelIndex, 10)}>
                            <Text style={styles.manualBtnText}>Run 10 min</Text>
                        </Pressable>
                        <Pressable style={manualBtnStyle('crimson')} onPress={() => turnOffChannel(channelIndex)}>
                            <Text style={styles.manualBtnText}>Stop</Text>
                        </Pressable>
                    </View>

                    {/* ── Week headers ── */}
                    <View style={styles.weekHeaderRow}>
                        <Text style={styles.weekHeader}>Week 1</Text>
                        <Text style={styles.weekHeader}>Week 2</Text>
                    </View>

                    {/* ── Day grid: 7 rows × 2 columns ── */}
                    {DAY_LABELS.map((dayLabel, i) => {
                        const day1 = i;
                        const day2 = i + 7;
                        const on1 = isEnabled(schedule, channelIndex, day1);
                        const on2 = isEnabled(schedule, channelIndex, day2);
                        const entry1 = dayMap?.[day1];
                        const entry2 = dayMap?.[day2];

                        return (
                            <View key={i} style={styles.dayRow}>
                                {[day1, day2].map((day, col) => {
                                    const on = col === 0 ? on1 : on2;
                                    const entry = col === 0 ? entry1 : entry2;
                                    return (
                                        <Pressable
                                            key={col}
                                            style={dayBtnStyle(on)}
                                            onPress={() => router.push({
                                                pathname: '/specificEdit',
                                                params: { day, channelIndex, label },
                                            })}
                                        >
                                            <Text style={styles.dayLabel}>{dayLabel}</Text>
                                            <Text style={styles.dayStatus}>{on ? 'On' : 'Off'}</Text>
                                            {on && entry && (
                                                <Text style={styles.dayTime}>
                                                    {formatTime(entry.startTime)} · {entry.durations[channelIndex]}m
                                                </Text>
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

export default Zone;

const styles = StyleSheet.create({
    zoneContainer: {
        borderRadius: SIZES.small,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    headerText: {
        fontSize: SIZES.medium,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
    },
    runningBadge: {
        fontSize: SIZES.small,
        color: '#7fff7f',
        fontWeight: 'bold',
        marginRight: 8,
    },
    body: {
        padding: SIZES.small,
        backgroundColor: COLORS.lightWhite,
    },
    manualRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: SIZES.small,
    },
    manualBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: SIZES.small,
    },
    weekHeaderRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    weekHeader: {
        flex: 1,
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: SIZES.small,
        color: COLORS.gray,
    },
    dayRow: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 4,
    },
    dayLabel: {
        fontSize: SIZES.small,
        fontWeight: 'bold',
    },
    dayStatus: {
        fontSize: SIZES.small,
        color: COLORS.gray,
    },
    dayTime: {
        fontSize: 10,
        color: '#444',
    },
});
