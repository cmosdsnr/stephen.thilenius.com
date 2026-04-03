
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { COLORS, SIZES } from '../../constants';
import { CHANNEL_LABELS, NUM_CHANNELS } from '../../constants/sprinkler';
import { useSprinkler } from '../../contexts/SprinklerContext';

export default function ManualTab() {
    const { channelActive, turnOnChannel, turnOffChannel } = useSprinkler();
    const [duration, setDuration] = useState('10');
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef(null);
    const startRef = useRef(null);

    useEffect(() => {
        if (channelActive >= 0) {
            startRef.current = Date.now();
            timerRef.current = setInterval(() => {
                setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
            }, 1000);
        } else {
            clearInterval(timerRef.current);
            setElapsed(0);
        }
        return () => clearInterval(timerRef.current);
    }, [channelActive]);

    const dur = Math.max(1, parseInt(duration) || 10);
    const remaining = Math.max(0, dur * 60 - elapsed);
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');

    return (
        <View style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.title}>Manual Override</Text>

                <View style={styles.durationRow}>
                    <Text style={styles.label}>Duration (min):</Text>
                    <TextInput
                        style={styles.durationInput}
                        value={duration}
                        onChangeText={setDuration}
                        keyboardType="numeric"
                        selectTextOnFocus
                    />
                </View>

                {channelActive >= 0 && (
                    <View style={styles.runningBanner}>
                        <Text style={styles.runningText}>
                            {CHANNEL_LABELS[channelActive]} running — {mm}:{ss} elapsed
                        </Text>
                    </View>
                )}

                <View style={styles.table}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.cell, styles.cellCh, styles.headerText]}>Channel</Text>
                        <Text style={[styles.cell, styles.cellStatus, styles.headerText]}>Status</Text>
                        <Text style={[styles.cell, styles.cellAction, styles.headerText]}>Action</Text>
                    </View>
                    {Array.from({ length: NUM_CHANNELS }, (_, i) => {
                        const isActive = channelActive === i;
                        return (
                            <View key={i} style={[styles.row, isActive && styles.rowActive]}>
                                <Text style={[styles.cell, styles.cellCh]}>{CHANNEL_LABELS[i]}</Text>
                                <Text style={[styles.cell, styles.cellStatus, isActive && styles.activeText]}>
                                    {isActive ? 'RUNNING' : 'Idle'}
                                </Text>
                                <View style={[styles.cell, styles.cellAction]}>
                                    {isActive ? (
                                        <Pressable style={styles.stopBtn} onPress={() => turnOffChannel(i)}>
                                            <Text style={styles.btnText}>Stop</Text>
                                        </Pressable>
                                    ) : (
                                        <Pressable
                                            style={[styles.startBtn, channelActive >= 0 && styles.btnDisabled]}
                                            onPress={() => channelActive < 0 && turnOnChannel(i, dur)}
                                        >
                                            <Text style={styles.btnText}>Run</Text>
                                        </Pressable>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.lightWhite },
    scroll: { padding: SIZES.medium, gap: SIZES.medium },
    title: { fontSize: SIZES.xLarge, fontWeight: 'bold', color: COLORS.primary },
    durationRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    label: { fontSize: SIZES.medium, color: COLORS.secondary },
    durationInput: {
        borderWidth: 1, borderColor: '#ccc', borderRadius: 6,
        padding: 8, width: 60, fontSize: SIZES.medium, textAlign: 'center',
    },
    runningBanner: {
        backgroundColor: '#c8f5c8', borderRadius: 8, padding: 12,
    },
    runningText: { fontSize: SIZES.medium, color: '#2a7a2a', fontWeight: 'bold', textAlign: 'center' },
    table: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, overflow: 'hidden' },
    headerRow: { flexDirection: 'row', backgroundColor: COLORS.primary },
    headerText: { color: '#fff', fontWeight: 'bold' },
    row: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eee' },
    rowActive: { backgroundColor: '#e8ffe8' },
    cell: { padding: 12, justifyContent: 'center' },
    cellCh: { flex: 1 },
    cellStatus: { flex: 1 },
    cellAction: { flex: 1, alignItems: 'flex-start' },
    activeText: { color: '#2a7a2a', fontWeight: 'bold' },
    startBtn: { backgroundColor: COLORS.tertiary, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14 },
    stopBtn: { backgroundColor: 'crimson', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14 },
    btnDisabled: { opacity: 0.4 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: SIZES.small },
});
