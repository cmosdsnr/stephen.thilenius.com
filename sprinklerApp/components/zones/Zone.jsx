import { StyleSheet, Text, View, TouchableOpacity, Pressable } from 'react-native';
import { useRef, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { COLORS, SIZES } from '../../constants';
import { DAY_LABELS } from '../../constants/sprinkler';
import { useSprinkler } from '../../contexts/SprinklerContext';

/**
 * Returns true if this channel has a schedule entry on the given day.
 */
function isEnabled(schedule, channelIndex, day) {
    return schedule.some(e => e.ch === channelIndex && e.day === day);
}

/**
 * Format minutes-from-midnight as HH:MM.
 */
function formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const Zone = ({ channelIndex, label }) => {
    const [showZone, setShowZone] = useState(false);
    const router = useRouter();
    const { schedule, dayMap, channelActive, turnOnChannel, turnOffChannel } = useSprinkler();

    const isRunning = channelActive === channelIndex;

    return (
        <View style={styles.zoneContainer}>
            {/* ── Header ── */}
            <Pressable style={styles.header(showZone, isRunning)} onPress={() => setShowZone(v => !v)}>
                <Text style={styles.headerText}>{label}</Text>
                {isRunning && <Text style={styles.runningBadge}>RUNNING</Text>}
                <FontAwesome name={showZone ? 'chevron-up' : 'chevron-down'} size={16} color="#fff" />
            </Pressable>

            {showZone && (
                <View style={styles.body}>
                    {/* ── Manual on/off ── */}
                    <View style={styles.manualRow}>
                        <Pressable style={styles.manualBtn('green')} onPress={() => turnOnChannel(channelIndex, 10)}>
                            <Text style={styles.manualBtnText}>Run 10 min</Text>
                        </Pressable>
                        <Pressable style={styles.manualBtn('crimson')} onPress={() => turnOffChannel(channelIndex)}>
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
                        const entry1 = dayMap[day1];
                        const entry2 = dayMap[day2];

                        return (
                            <View key={i} style={styles.dayRow}>
                                {[day1, day2].map((day, col) => {
                                    const on = col === 0 ? on1 : on2;
                                    const entry = col === 0 ? entry1 : entry2;
                                    return (
                                        <Pressable
                                            key={col}
                                            style={styles.dayBtn(on)}
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
    header: (open, running) => ({
        backgroundColor: running ? '#2a7a2a' : open ? COLORS.primary : COLORS.tertiary,
        padding: SIZES.medium,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    }),
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
    manualBtn: (color) => ({
        flex: 1,
        backgroundColor: color,
        borderRadius: 6,
        padding: 8,
        alignItems: 'center',
    }),
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
    dayBtn: (enabled) => ({
        flex: 1,
        backgroundColor: enabled ? '#c8f5c8' : '#f5c8c8',
        borderRadius: 6,
        padding: 6,
        alignItems: 'center',
    }),
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
