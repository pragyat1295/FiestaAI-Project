import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../../screens/ChatScreen.style';
import { useChat } from '../../hooks/useChat';

const Header = () => {
    const { isStreaming, messages, resetChat } = useChat();
    return (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <View style={styles.headerDot} />
                <Text style={styles.headerTitle}>Pragy AI</Text>
            </View>
            <View style={styles.headerRight}>
                {isStreaming && (
                    <View style={styles.streamingBadge}>
                        <View style={styles.streamingDot} />
                        <Text style={styles.streamingLabel}>Streaming…</Text>
                    </View>
                )}
                {messages.length > 0 && (
                    <TouchableOpacity
                        style={styles.resetButton}
                        onPress={resetChat}
                        activeOpacity={0.75}
                        accessibilityLabel="Clear chat"
                        accessibilityRole="button"
                    >
                        <Text style={styles.resetButtonText}>✕ New Chat</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};
export default memo(Header);
