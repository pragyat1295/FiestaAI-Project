import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../../screens/ChatScreen.style';
import { SERVICES } from '../../constants';
import { LLMService, useChat } from '../../hooks/useChat';

const ServiceSwitch = ({ handleServiceChange }: { handleServiceChange: (service: LLMService) => void }) => {
    const {selectedService, isStreaming, groqToken, geminiToken} = useChat();
    return (
        <View style={styles.serviceSwitcher}>
            {SERVICES.map(svc => {
                const active = selectedService === svc.id;
                // Show a small lock icon if Groq/Gemini has no token yet
                const needsToken =
                    (svc.id === 'groq' && !groqToken) ||
                    (svc.id === 'gemini' && !geminiToken);
                return (
                    <TouchableOpacity
                        key={svc.id}
                        style={[styles.serviceTab, active && styles.serviceTabActive]}
                        onPress={() => handleServiceChange(svc.id)}
                        activeOpacity={0.75}
                        accessibilityLabel={`Switch to ${svc.label}`}
                        accessibilityRole="button"
                        disabled={isStreaming}
                    >
                        <Text style={[styles.serviceTabText, active && styles.serviceTabTextActive]}>
                            {svc.icon} {svc.label}{needsToken && !active ? ' 🔑' : ''}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};
export default memo(ServiceSwitch);
