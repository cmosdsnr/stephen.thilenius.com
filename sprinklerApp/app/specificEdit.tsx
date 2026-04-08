/**
 * @module app/specificEdit
 * @description Stack screen for editing the start time and per-channel
 * duration for a specific day/channel combination.
 *
 * Navigated to from the {@link module:components/zones/Zone} day grid cells
 * via:
 * ```js
 * router.push({ pathname: '/specificEdit', params: { day, channelIndex, label } })
 * ```
 *
 * The screen title is dynamically set to `"<label> — <Week N> <DayName>"`.
 * Duration is selected from a fixed grid of values (0, 5, 10, … 65 minutes).
 * Time is adjusted with ▲/▼ spinners for hours and 5-minute increments.
 *
 * > **Note**: This screen reads `dayMap` and calls `updateDay` from
 * > `useSprinkler()`. These are not currently exported by
 * > {@link module:SprinklerContext} — they are placeholders for a future
 * > per-day direct-edit flow that has not yet been implemented in the context.
 */

import { StyleSheet, Text, View, SafeAreaView, Pressable, ScrollView, ViewStyle } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { COLORS, SIZES } from '../constants';
import { FULL_DAY_LABELS, NUM_CHANNELS, CHANNEL_LABELS } from '../constants/sprinkler';
import { useSprinkler } from '../contexts/SprinklerContext';

interface TimeComponents {
    hours: number;
    minutes: number;
}

/**
 * Split a total-minutes value into hours and minutes components.
 *
 * @param {number} totalMinutes - Time value (0–1439).
 * @returns {TimeComponents}
 */
function splitTime(totalMinutes: number): TimeComponents {
    return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

interface TimePickerProps {
    totalMinutes: number;
    onChange: (value: number) => void;
}

/**
 * Drum-roller style time picker with hour and 5-minute increment spinners.
 *
 * @param {TimePickerProps} props
 * @returns {React.ReactElement}
 */
function TimePicker({ totalMinutes, onChange }: TimePickerProps) {
    const { hours, minutes } = splitTime(totalMinutes);
    const adjust = (deltaH: number, deltaM: number) => {
        let h = hours + deltaH;
        let m = minutes + deltaM;
        if (m >= 60) { h += 1; m -= 60; }
        if (m < 0)   { h -= 1; m += 60; }
        h = Math.max(0, Math.min(23, h));
        onChange(h * 60 + m);
    };
    return (
        <View style={tpStyles.row}>
            <View style={tpStyles.col}>
                <Pressable style={tpStyles.btn} onPress={() => adjust(1, 0)}>
                    <Text style={tpStyles.btnText}>▲</Text>
                </Pressable>
                <Text style={tpStyles.value}>{String(hours).padStart(2, '0')}</Text>
                <Pressable style={tpStyles.btn} onPress={() => adjust(-1, 0)}>
                    <Text style={tpStyles.btnText}>▼</Text>
                </Pressable>
            </View>
            <Text style={tpStyles.colon}>:</Text>
            <View style={tpStyles.col}>
                <Pressable style={tpStyles.btn} onPress={() => adjust(0, 5)}>
                    <Text style={tpStyles.btnText}>▲</Text>
                </Pressable>
                <Text style={tpStyles.value}>{String(minutes).padStart(2, '0')}</Text>
                <Pressable style={tpStyles.btn} onPress={() => adjust(0, -5)}>
                    <Text style={tpStyles.btnText}>▼</Text>
                </Pressable>
            </View>
        </View>
    );
}

const tpStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    col: { alignItems: 'center', gap: 8 },
    btn: { backgroundColor: COLORS.tertiary, borderRadius: 6, padding: 10, width: 50, alignItems: 'center' },
    btnText: { fontSize: 18, color: '#fff' },
    value: { fontSize: 36, fontWeight: 'bold', width: 60, textAlign: 'center' },
    colon: { fontSize: 36, fontWeight: 'bold', marginBottom: 8 },
});

/** Duration options available in the selection grid (multiples of 5, 0–65 min). */
const DURATION_OPTIONS = Array.from({ length: 14 }, (_, i) => i * 5);

// Dynamic style creator for duration buttons
const durBtnStyle = (selected: boolean): ViewStyle => ({
    width: 60,
    height: 44,
    borderRadius: 8,
    backgroundColor: selected ? '#4caf50' : '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
});

/**
 * Stack screen component for editing a specific day/channel schedule entry.
 *
 * @returns {React.ReactElement}
 */
export default function SpecificEditScreen() {
    const params = useLocalSearchParams<{ day: string; channelIndex: string; label: string }>();
    const router = useRouter();
    const day = Number(params.day);
    const channelIndex = Number(params.channelIndex);
    const label = params.label ?? CHANNEL_LABELS[channelIndex];

    const { dayMap, updateDay } = useSprinkler();

    const existing = dayMap?.[day];
    const [startTime, setStartTime] = useState(existing?.startTime ?? 360);
    const [durations, setDurations] = useState<number[]>(
        existing?.durations ?? Array(NUM_CHANNELS).fill(0)
    );

    const currentDuration = durations[channelIndex];
    const weekLabel = day < 7 ? 'Week 1' : 'Week 2';
    const dayLabel = FULL_DAY_LABELS[day % 7];

    /**
     * Update the duration for the current channel in local state.
     *
     * @param {number} value - New duration in minutes.
     */
    function setDuration(value: number) {
        const next = [...durations];
        next[channelIndex] = value;
        setDurations(next);
    }

    /** Persist the edited start time and durations then navigate back. */
    function save() {
        updateDay?.(day, startTime, durations);
        router.back();
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ title: `${label} — ${weekLabel} ${dayLabel}` }} />
            <ScrollView contentContainerStyle={styles.scroll}>

                <Text style={styles.sectionLabel}>Start Time</Text>
                <TimePicker totalMinutes={startTime} onChange={setStartTime} />

                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
                    Duration for {label}: {currentDuration} min
                </Text>
                <View style={styles.grid}>
                    {DURATION_OPTIONS.map(val => (
                        <Pressable
                            key={val}
                            style={durBtnStyle(val === currentDuration)}
                            onPress={() => setDuration(val)}
                        >
                            <Text style={styles.durText}>{val}</Text>
                        </Pressable>
                    ))}
                </View>

                <View style={styles.actionRow}>
                    <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={styles.saveBtn} onPress={save}>
                        <Text style={styles.saveText}>Save</Text>
                    </Pressable>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.lightWhite },
    scroll: { padding: SIZES.medium, gap: SIZES.medium },
    sectionLabel: {
        fontSize: SIZES.medium,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 8,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    durText: {
        fontSize: SIZES.medium,
        fontWeight: 'bold',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    saveBtn: {
        flex: 1,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
    },
    saveText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: SIZES.medium,
    },
    cancelBtn: {
        flex: 1,
        backgroundColor: '#ccc',
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
    },
    cancelText: {
        color: '#333',
        fontWeight: 'bold',
        fontSize: SIZES.medium,
    },
});
