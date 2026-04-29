import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { styles } from '../../screens/ChatScreen.style';
import { SUGGESTIONS } from '../../constants';

const EmptyState = () => {
    return (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✦</Text>
            <Text style={styles.emptyTitle}>Pragy AI</Text>
            <Text style={styles.emptySubtitle}>
                Ask me anything.
            </Text>
            <View style={styles.suggestionRow}>
                {SUGGESTIONS.map(s => (
                    <View key={s} style={styles.suggestionChip}>
                        <Text style={styles.suggestionText}>{s}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};
export default memo(EmptyState);
