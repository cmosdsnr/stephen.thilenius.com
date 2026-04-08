/**
 * @module components/zones/Zones
 * @description Container component that renders one {@link Zone} card for
 * every channel defined by {@link module:constants/sprinkler.NUM_CHANNELS}.
 */

import { View, StyleSheet } from 'react-native';
import { NUM_CHANNELS, CHANNEL_LABELS } from '../../constants/sprinkler';
import Zone from './Zone';

/**
 * Renders the full list of zone cards.
 * Intended to be placed inside a `ScrollView` on the Zones tab.
 *
 * @returns {React.ReactElement}
 */
const Zones = () => {
    return (
        <View style={styles.container}>
            {Array.from({ length: NUM_CHANNELS }, (_, ch) => (
                <Zone key={ch} channelIndex={ch} label={CHANNEL_LABELS[ch]} />
            ))}
        </View>
    );
};

export default Zones;

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
});
