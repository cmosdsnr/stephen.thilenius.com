import { View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { COLORS, SIZES } from '../../constants';
import { CHANNEL_LABELS, DAY_LABELS, NUM_CHANNELS, NUM_DAYS, RULE_COLORS } from '../../constants/sprinkler';
import { useSprinkler } from '../../contexts/SprinklerContext';

const WEEK1 = Array.from({ length: 7 }, (_, i) => i);
const WEEK2 = Array.from({ length: 7 }, (_, i) => i + 7);

function emptyRule() {
    return {
        days: Array(NUM_DAYS).fill(false),
        startTime: 360,
        durations: Array(NUM_CHANNELS).fill(0),
    };
}

function formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function endTime(rule) {
    const total = rule.durations.reduce((a, b) => a + b, 0);
    return (rule.startTime + total) % 1440;
}

function WeekDayRow({ label, week, rule, rowStyle }) {
    const hasDays = week.some(index => rule.days[index]);
    return (
        <View style={[styles.dayRow, rowStyle]}>
            <Text style={styles.dayRowLabel}>{label}</Text>
            <View style={styles.dayPills}>
                {week.map(index => rule.days[index] ? (
                    <View key={index} style={[styles.pill, index < 7 ? styles.pill1 : styles.pill2]}>
                        <Text style={styles.pillText}>{DAY_LABELS[index % 7]}</Text>
                    </View>
                ) : null)}
                {!hasDays && <Text style={styles.noDays}>None</Text>}
            </View>
        </View>
    );
}

function RuleModal({ rule, onSave, onDelete, onCancel }) {
    const [editing, setEditing] = useState(() => rule ?? emptyRule());
    if (!editing) return null;

    const toggleDay = (i) => {
        const next = [...editing.days];
        next[i] = !next[i];
        setEditing({ ...editing, days: next });
    };
    const toggleWeek = (week) => {
        const allOn = week.every(i => editing.days[i]);
        const next = [...editing.days];
        week.forEach(i => { next[i] = !allOn; });
        setEditing({ ...editing, days: next });
    };
    const setDuration = (ch, val) => {
        const next = [...editing.durations];
        next[ch] = Math.max(0, parseInt(val) || 0);
        setEditing({ ...editing, durations: next });
    };
    const adjustTime = (delta) => {
        let t = editing.startTime + delta;
        if (t < 0) t += 1440;
        if (t >= 1440) t -= 1440;
        setEditing({ ...editing, startTime: t });
    };
    const canSave = editing.days.some(Boolean) && editing.durations.some(d => d > 0);

    return (
        <Modal visible animationType="slide">
            <SafeAreaView style={mStyles.safeArea}>
                <ScrollView contentContainerStyle={mStyles.scroll}>
                    <Text style={mStyles.title}>{rule && rule.id != null ? 'Edit Rule' : 'New Rule'}</Text>

                    <Text style={mStyles.sectionLabel}>Days</Text>
                    {[WEEK1, WEEK2].map((week, wi) => (
                        <View key={wi} style={[mStyles.weekRow, wi === 0 ? mStyles.week1Bg : mStyles.week2Bg]}>
                            <Pressable style={mStyles.allBtn} onPress={() => toggleWeek(week)}>
                                <Text style={mStyles.allBtnText}>All</Text>
                            </Pressable>
                            {week.map(i => (
                                <Pressable key={i} style={[mStyles.dayChip, editing.days[i] && mStyles.dayChipOn]} onPress={() => toggleDay(i)}>
                                    <Text style={[mStyles.dayChipText, editing.days[i] && mStyles.dayChipTextOn]}>
                                        {DAY_LABELS[i % 7]}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    ))}

                    <Text style={mStyles.sectionLabel}>Start Time: {formatTime(editing.startTime)}</Text>
                    <View style={mStyles.timeRow}>
                        {[-60, -15, -5, 5, 15, 60].map(d => (
                            <Pressable key={d} style={mStyles.timeBtn} onPress={() => adjustTime(d)}>
                                <Text style={mStyles.timeBtnText}>{d > 0 ? `+${d}` : d}m</Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={mStyles.sectionLabel}>Durations (minutes)</Text>
                    <View style={mStyles.durGrid}>
                        {CHANNEL_LABELS.map((label, ch) => (
                            <View key={ch} style={mStyles.durItem}>
                                <Text style={mStyles.durLabel}>{label}</Text>
                                <TextInput
                                    style={mStyles.durInput}
                                    value={String(editing.durations[ch])}
                                    onChangeText={v => setDuration(ch, v)}
                                    keyboardType="numeric"
                                    selectTextOnFocus
                                />
                            </View>
                        ))}
                    </View>

                    <View style={mStyles.actionRow}>
                        {rule && rule.id != null && (
                            <Pressable style={mStyles.deleteBtn} onPress={() => onDelete(rule.id)}>
                                <Text style={mStyles.deleteBtnText}>Delete</Text>
                            </Pressable>
                        )}
                        <Pressable style={mStyles.cancelBtn} onPress={onCancel}>
                            <Text style={mStyles.cancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable style={[mStyles.saveBtn, !canSave && mStyles.btnDisabled]} onPress={() => canSave && onSave(editing)}>
                            <Text style={mStyles.saveBtnText}>Save</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

export default function RulesTab() {
    const { rules, addRule, saveRule, deleteRule } = useSprinkler();
    const [modalRule, setModalRule] = useState(null);

    function openNew() { setModalRule(emptyRule()); }
    function openEdit(rule) { setModalRule(rule); }
    function handleSave(rule) {
        if (rule.id != null) saveRule(rule);
        else addRule(rule);
        setModalRule(null);
    }
    function handleDelete(id) { deleteRule(id); setModalRule(null); }

    return (
        <View style={styles.container}>
            <View style={styles.addRow}>
                <TouchableOpacity style={styles.addBtn} onPress={openNew} activeOpacity={0.7}>
                    <Text style={styles.addBtnText}>+ New Rule</Text>
                </TouchableOpacity>
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll}>
                {rules.length === 0 && (
                    <Text style={styles.empty}>No rules yet. Tap + New Rule to add one.</Text>
                )}
                {rules.map((rule, idx) => (
                    <Pressable key={rule.id} style={[styles.ruleCard, { borderLeftColor: RULE_COLORS[idx % RULE_COLORS.length] }]} onPress={() => openEdit(rule)}>
                        <View style={styles.ruleHeader}>
                            <Text style={styles.ruleNum}>Rule {idx + 1}</Text>
                            <Text style={styles.ruleTimes}>{formatTime(rule.startTime)} to {formatTime(endTime(rule))}</Text>
                        </View>
                        <WeekDayRow label="Week 1" week={WEEK1} rule={rule} rowStyle={styles.week1Row} />
                        <WeekDayRow label="Week 2" week={WEEK2} rule={rule} rowStyle={styles.week2Row} />
                        <Text style={styles.durSummary}>
                            {CHANNEL_LABELS.map((l, i) => rule.durations[i] > 0 ? `${l}:${rule.durations[i]}m` : null).filter(Boolean).join('  ')}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>
            {modalRule && (
                <RuleModal
                    rule={modalRule}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onCancel={() => setModalRule(null)}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.lightWhite },
    addRow: { padding: SIZES.medium, alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: '#ddd' },
    addBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
    addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: SIZES.small },
    scrollView: { flex: 1 },
    scroll: { padding: SIZES.medium, gap: SIZES.medium },
    empty: { color: COLORS.gray, textAlign: 'center', marginTop: 40, fontSize: SIZES.medium },
    ruleCard: { backgroundColor: '#fff', borderRadius: 8, padding: SIZES.medium, borderLeftWidth: 5, gap: 6, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    ruleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ruleNum: { fontWeight: 'bold', fontSize: SIZES.medium, color: COLORS.primary },
    ruleTimes: { fontSize: SIZES.small, color: COLORS.gray },
    dayRow: { borderRadius: 6, padding: 8, gap: 6 },
    week1Row: { backgroundColor: '#eef7ff' },
    week2Row: { backgroundColor: '#fff3e8' },
    dayRowLabel: { fontSize: SIZES.small, fontWeight: 'bold', color: COLORS.gray },
    dayPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    pill: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    pill1: { backgroundColor: '#d0e8ff' },
    pill2: { backgroundColor: '#ffe0c0' },
    pillText: { fontSize: 11, fontWeight: 'bold' },
    noDays: { color: COLORS.gray, fontSize: SIZES.small },
    durSummary: { fontSize: SIZES.small, color: COLORS.gray },
});

const mStyles = StyleSheet.create({
    safeArea: { flex: 1 },
    scroll: { padding: SIZES.medium, gap: SIZES.medium },
    title: { fontSize: SIZES.xLarge, fontWeight: 'bold', color: COLORS.primary },
    sectionLabel: { fontSize: SIZES.medium, fontWeight: 'bold', color: COLORS.secondary, marginTop: 8 },
    weekRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, borderRadius: 8, padding: 8, alignItems: 'center' },
    week1Bg: { backgroundColor: '#d8eeff' },
    week2Bg: { backgroundColor: '#ffe8d0' },
    allBtn: { backgroundColor: COLORS.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    allBtnText: { color: '#fff', fontWeight: 'bold', fontSize: SIZES.small },
    dayChip: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#eee' },
    dayChipOn: { backgroundColor: COLORS.primary },
    dayChipText: { fontSize: SIZES.small, fontWeight: 'bold', color: '#444' },
    dayChipTextOn: { color: '#fff' },
    timeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    timeBtn: { backgroundColor: COLORS.tertiary, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
    timeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: SIZES.small },
    durGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    durItem: { alignItems: 'center', gap: 4 },
    durLabel: { fontSize: SIZES.small, fontWeight: 'bold', color: COLORS.secondary },
    durInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, width: 52, padding: 8, fontSize: SIZES.medium, textAlign: 'center' },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    deleteBtn: { flex: 1, backgroundColor: 'crimson', borderRadius: 8, padding: 14, alignItems: 'center' },
    deleteBtnText: { color: '#fff', fontWeight: 'bold', fontSize: SIZES.medium },
    cancelBtn: { flex: 1, backgroundColor: '#ccc', borderRadius: 8, padding: 14, alignItems: 'center' },
    cancelText: { color: '#333', fontWeight: 'bold', fontSize: SIZES.medium },
    saveBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: SIZES.medium },
    btnDisabled: { opacity: 0.4 },
});
