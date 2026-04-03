
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { COLORS, SIZES } from '../../constants';
import { useSprinkler } from '../../contexts/SprinklerContext';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatEpoch(val) {
    if (val > 1_774_000_000 && val < 3_000_000_000) {
        return new Date(val * 1000).toLocaleString();
    }
    return String(val);
}

function Row({ label, value, sub }) {
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <View style={styles.rowValues}>
                <Text style={styles.rowValue}>{value}</Text>
                {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
            </View>
        </View>
    );
}

export default function VariablesTab() {
    const { variables, channelActive, readyState, reload } = useSprinkler();

    const wsStatus = ['Connecting', 'Open', 'Closing', 'Closed'][readyState] ?? 'Unknown';

    const { epoch, boundary, daysSinceBoundary, dayStart, localTime } = variables;

    return (
        <View style={styles.safeArea}>
            <View style={styles.header}>
                <Text style={styles.title}>System Variables</Text>
                <Pressable style={styles.reloadBtn} onPress={reload}>
                    <Text style={styles.reloadText}>Refresh</Text>
                </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.scroll}>

                <Text style={styles.section}>Connection</Text>
                <Row label="WebSocket" value={wsStatus} />
                <Row label="Active Channel" value={channelActive >= 0 ? `Channel ${channelActive}` : 'None'} />

                <Text style={styles.section}>Time</Text>
                {localTime != null && (
                    <Row label="Local Time" value={formatEpoch(localTime)} />
                )}
                {epoch != null && (
                    <Row
                        label="Epoch"
                        value={String(epoch)}
                        sub={formatEpoch(epoch)}
                    />
                )}
                {boundary != null && (
                    <Row
                        label="Boundary"
                        value={String(boundary)}
                        sub={boundary > 0 ? new Date(boundary * 1000).toLocaleDateString() : '—'}
                    />
                )}
                {daysSinceBoundary != null && (
                    <Row
                        label="Days Since Boundary"
                        value={String(daysSinceBoundary)}
                        sub={`${DAY_NAMES[daysSinceBoundary % 7]} (${daysSinceBoundary < 7 ? 'Week 1' : 'Week 2'})`}
                    />
                )}
                {dayStart != null && (
                    <Row
                        label="Day Start"
                        value={String(dayStart)}
                        sub={dayStart > 0 ? new Date(dayStart * 1000).toLocaleString() : '—'}
                    />
                )}

                {Object.keys(variables).length === 0 && (
                    <Text style={styles.empty}>No variables received yet.</Text>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.lightWhite },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SIZES.medium, borderBottomWidth: 1, borderBottomColor: '#ddd' },
    title: { fontSize: SIZES.xLarge, fontWeight: 'bold', color: COLORS.primary },
    reloadBtn: { backgroundColor: COLORS.tertiary, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 },
    reloadText: { color: '#fff', fontWeight: 'bold', fontSize: SIZES.small },
    scroll: { padding: SIZES.medium, gap: 2 },
    section: { fontSize: SIZES.medium, fontWeight: 'bold', color: COLORS.secondary, marginTop: 12, marginBottom: 4 },
    row: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee', gap: 8 },
    rowLabel: { width: 140, fontSize: SIZES.small, color: COLORS.gray, fontWeight: 'bold' },
    rowValues: { flex: 1 },
    rowValue: { fontSize: SIZES.small, color: '#333' },
    rowSub: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
    empty: { color: COLORS.gray, textAlign: 'center', marginTop: 40 },
});
