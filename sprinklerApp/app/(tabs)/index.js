
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SIZES } from '../../constants';
import { useSprinkler } from '../../contexts/SprinklerContext';
import Zones from '../../components/zones/Zones';

export default function ZonesTab() {
    const { name, dataLoaded, rulesError, acknowledged } = useSprinkler();

    return (
        <View style={styles.safeArea}>
            <View style={styles.header}>
                <Text style={styles.title}>{name || 'Sprinklers'}</Text>
                {!acknowledged && <Text style={styles.saving}>Saving…</Text>}
                {rulesError && <Text style={styles.error}>ESP did not acknowledge</Text>}
            </View>
            {dataLoaded ? (
                <ScrollView contentContainerStyle={styles.scroll}>
                    <Zones />
                </ScrollView>
            ) : (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Connecting…</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.lightWhite },
    header: {
        paddingHorizontal: SIZES.medium,
        paddingTop: SIZES.medium,
        paddingBottom: SIZES.small,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    title: { fontSize: SIZES.xLarge, fontWeight: 'bold', color: COLORS.primary },
    saving: { fontSize: SIZES.small, color: COLORS.gray, marginTop: 2 },
    error: { fontSize: SIZES.small, color: 'red', marginTop: 2 },
    scroll: { padding: SIZES.medium, gap: SIZES.medium },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SIZES.medium },
    loadingText: { fontSize: SIZES.medium, color: COLORS.gray },
});
