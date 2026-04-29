import React, { memo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';

interface ChatInputProps {
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ isStreaming, onSend, onStop }) => {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isStreaming) { return; }
    onSend(trimmed);
    setInputText('');
    inputRef.current?.focus();
  };

  const handleStop = () => {
    onStop();
    inputRef.current?.focus();
  };

  const canSend = inputText.trim().length > 0 && !isStreaming;

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Message Pragy AI…"
          placeholderTextColor="#5A52A0"
          multiline
          maxLength={4000}
          numberOfLines={1}
          // Allow typing while streaming (queued for next send)
          editable={true}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
          keyboardAppearance="dark"
          selectionColor="#7C6AF7"
        />

        {isStreaming ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.stopButton]}
            onPress={handleStop}
            activeOpacity={0.8}
            accessibilityLabel="Stop generating"
            accessibilityRole="button"
          >
            <View style={styles.stopIcon} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.sendButton,
              !canSend && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.8}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            <Text style={styles.sendArrow}>↑</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.disclaimer}>
        Pragy AI · Powered by Pragyat Mishra
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F0D1F',
    borderTopWidth: 1,
    borderTopColor: '#1E1B3A',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 8 : 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1A1730',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2550',
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#E0DEFF',
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? 6 : 4,
    paddingBottom: Platform.OS === 'ios' ? 6 : 4,
    lineHeight: 22,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    alignSelf: 'flex-end',
  },
  sendButton: {
    backgroundColor: '#7C6AF7',
  },
  sendButtonDisabled: {
    backgroundColor: '#2A2550',
  },
  sendArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  stopButton: {
    backgroundColor: '#FF4560',
  },
  stopIcon: {
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#3D3760',
    marginTop: 6,
  },
});

export default memo(ChatInput);
