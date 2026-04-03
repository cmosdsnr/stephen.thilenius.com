import { StyleSheet, Text, View, SafeAreaView, Pressable, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { COLORS, SIZES } from '../constants';
import { FULL_DAY_LABELS, NUM_CHANNELS, CHANNEL_LABELS } from '../constants/sprinkler';
import { useSprinkler } from '../contexts/SprinklerContext';

/**
 * Convert minutes-from-midnight to { hours, minutes }.
 */
function splitTime(totalMinutes) {
    return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

/**
 * Simple +/- time picker (no external dependencies).
 */
function TimePicker({ totalMinutes, onChange }) {
    const { hours, minutes } = splitTime(totalMinutes);
    const adjust = (deltaH, deltaM) => {
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

// Duration options: 0, 5, 10, … 65 minutes
const DURATION_OPTIONS = Array.from({ length: 14 }, (_, i) => i * 5);

const SpecificEdit = () => {
    const params = useLocalSearchParams();
    const router = useRouter();
    const day = Number(params.day);
    const channelIndex = Number(params.channelIndex);
    const label = params.label ?? CHANNEL_LABELS[channelIndex];

    const { dayMap, updateDay } = useSprinkler();

    // Initialise from existing schedule entry (if any)
    const existing = dayMap[day];
    const [startTime, setStartTime] = useState(existing?.startTime ?? 360); // default 6:00 AM
    const [durations, setDurations] = useState(
        existing?.durations ?? Array(NUM_CHANNELS).fill(0)
    );

    const currentDuration = durations[channelIndex];
    const weekLabel = day < 7 ? 'Week 1' : 'Week 2';
    const dayLabel = FULL_DAY_LABELS[day % 7];

    function setDuration(value) {
        const next = [...durations];
        next[channelIndex] = value;
        setDurations(next);
    }

    function save() {
        updateDay(day, startTime, durations);
        router.back();
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ headerTitle: `${label} — ${weekLabel} ${dayLabel}` }} />
            <ScrollView contentContainerStyle={styles.scroll}>

                {/* ── Start time ── */}
                <Text style={styles.sectionLabel}>Start Time</Text>
                <TimePicker totalMinutes={startTime} onChange={setStartTime} />

                {/* ── Duration ── */}
                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
                    Duration for {label}: {currentDuration} min
                </Text>
                <View style={styles.grid}>
                    {DURATION_OPTIONS.map(val => (
                        <Pressable
                            key={val}
                            style={styles.durBtn(val === currentDuration)}
                            onPress={() => setDuration(val)}
                        >
                            <Text style={styles.durText}>{val}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* ── Save / Cancel ── */}
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
};

export default SpecificEdit;

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
    durBtn: (selected) => ({
        width: 60,
        height: 44,
        borderRadius: 8,
        backgroundColor: selected ? '#4caf50' : '#ddd',
        alignItems: 'center',
        justifyContent: 'center',
    }),
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
