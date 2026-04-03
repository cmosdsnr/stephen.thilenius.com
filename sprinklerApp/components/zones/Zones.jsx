import { View, StyleSheet } from 'react-native';
import { NUM_CHANNELS, CHANNEL_LABELS } from '../../constants/sprinkler';
import Zone from './Zone';

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
