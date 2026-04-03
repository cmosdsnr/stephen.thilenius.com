
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { COLORS, SIZES } from '../../constants';
import { DAY_LABELS, NUM_DAYS, CHANNEL_LABELS, RULE_COLORS } from '../../constants/sprinkler';
import { useSprinkler } from '../../contexts/SprinklerContext';

function formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
}

/**
 * For a given cycleDay (0-13), compute all watering entries from rules:
 * [{ ruleIdx, ch, startTime, duration }]
 */
function getEntries(rules, cycleDay) {
    const entries = [];
    rules.forEach((rule, ruleIdx) => {
        if (!rule.days[cycleDay]) return;
        let t = rule.startTime;
        rule.durations.forEach((dur, ch) => {
            if (dur > 0) {
                entries.push({ ruleIdx, ch, startTime: t, duration: dur });
                t += dur;
            }
        });
    });
    return entries;
}

export default function CalendarTab() {
    const { variables, rules, isSuspended, sendSuspend, channelActive } = useSprinkler();
    const { width } = useWindowDimensions();

    const today = variables.daysSinceBoundary ?? 0;
    const boundary = variables.boundary ?? 0;

    // 4 weeks × 7 days = 28 cells, cycling through the 14-day schedule
    const cellSize = Math.floor((width - SIZES.medium * 2 - 6 * 2) / 7);

    function getCellDate(i) {
        if (!boundary) return '';
        const ts = boundary + i * 86400;
        const d = new Date(ts * 1000);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    }

    function toggleSuspend(entry, cycleDay) {
        const date = boundary + cycleDay * 86400;
        const item = { date, startTime: entry.startTime, ch: entry.ch };
        const susp = isSuspended(entry.ch, date, entry.startTime);
        sendSuspend(item, !susp);
    }

    return (
        <View style={styles.safeArea}>
            <Text style={styles.title}>Schedule Calendar</Text>

            {/* Day headers */}
            <View style={styles.dayHeaders}>
                {DAY_LABELS.map(d => (
                    <Text key={d} style={[styles.dayHeader, { width: cellSize }]}>{d}</Text>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* 4 rows = 4 weeks */}
                {Array.from({ length: 4 }, (_, week) => (
                    <View key={week} style={styles.weekRow}>
                        {Array.from({ length: 7 }, (_, dow) => {
                            const i = week * 7 + dow;        // absolute day index (0-27)
                            const cycleDay = i % NUM_DAYS;   // position in 14-day cycle
                            const isToday = cycleDay === today;
                            const isWeek2 = cycleDay >= 7;
                            const entries = getEntries(rules, cycleDay);
                            const date = getCellDate(i);

                            return (
                                <View key={dow} style={[
                                    styles.cell,
                                    { width: cellSize, minHeight: cellSize },
                                    isWeek2 ? styles.cellWeek2 : styles.cellWeek1,
                                    isToday && styles.cellToday,
                                ]}>
                                    <Text style={[styles.dateLabel, isToday && styles.dateLabelToday]}>{date}</Text>
                                    {entries.map((entry, ei) => {
                                        const date2 = boundary + cycleDay * 86400;
                                        const susp = isSuspended(entry.ch, date2, entry.startTime);
                                        const isActive = channelActive === entry.ch && isToday;
                                        return (
                                            <Pressable
                                                key={ei}
                                                style={[
                                                    styles.entry,
                                                    { backgroundColor: susp ? '#ccc' : RULE_COLORS[entry.ruleIdx % RULE_COLORS.length] + '33' },
                                                    susp && styles.entrySupp,
                                                    isActive && styles.entryActive,
                                                ]}
                                                onPress={() => toggleSuspend(entry, cycleDay)}
                                            >
                                                <Text style={[styles.entryText, susp && styles.entryTextSupp]}>
                                                    {formatTime(entry.startTime)} {CHANNEL_LABELS[entry.ch]} {entry.duration}m
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            );
                        })}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.lightWhite },
    title: { fontSize: SIZES.xLarge, fontWeight: 'bold', color: COLORS.primary, padding: SIZES.medium, paddingBottom: 4 },
    dayHeaders: { flexDirection: 'row', paddingHorizontal: SIZES.medium },
    dayHeader: { fontSize: 10, fontWeight: 'bold', textAlign: 'center', color: COLORS.gray, paddingVertical: 4 },
    scroll: { padding: SIZES.medium, gap: 2 },
    weekRow: { flexDirection: 'row', gap: 2 },
    cell: { borderWidth: 1, borderColor: '#ccc', padding: 2, gap: 1 },
    cellWeek1: { backgroundColor: '#dceeff' },
    cellWeek2: { backgroundColor: '#fff0dc' },
    cellToday: { borderColor: COLORS.tertiary, borderWidth: 2 },
    dateLabel: { fontSize: 9, color: COLORS.gray, textAlign: 'center' },
    dateLabelToday: { color: COLORS.tertiary, fontWeight: 'bold' },
    entry: { borderRadius: 2, paddingHorizontal: 2, paddingVertical: 1 },
    entrySupp: { backgroundColor: '#ddd' },
    entryActive: { borderWidth: 1, borderColor: 'green' },
    entryText: { fontSize: 8, color: '#333' },
    entryTextSupp: { color: '#999', textDecorationLine: 'line-through' },
});
