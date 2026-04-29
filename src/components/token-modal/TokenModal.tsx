/**
 * TokenModal.tsx
 * --------------
 * Modal that prompts the user to enter an API token for Groq or Gemini.
 * Shown automatically when the user switches to one of those services
 * and no token has been stored yet.
 *
 * Design principles:
 *  - Dismissible via the Cancel button (service reverts to Ollama if no token)
 *  - Token is trimmed before being stored
 *  - Shows/hides the raw token via an eye-toggle so users can verify
 */

import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { LLMService } from '../../store/chatSlice';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TokenModalProps {
  visible: boolean;
  service: LLMService; // 'groq' | 'gemini' (never 'ollama')
  onConfirm: (token: string) => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Service meta
// ---------------------------------------------------------------------------

const SERVICE_META: Record<
  string,
  { label: string; icon: string; placeholder: string; docsUrl: string }
> = {
  groq: {
    label: 'Groq',
    icon: '⚡',
    placeholder: 'gsk_…',
    docsUrl: 'console.groq.com',
  },
  gemini: {
    label: 'Gemini',
    icon: '✦',
    placeholder: 'AIzaSy…',
    docsUrl: 'aistudio.google.com',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TokenModal: React.FC<TokenModalProps> = ({
  visible,
  service,
  onConfirm,
  onCancel,
}) => {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  const meta = SERVICE_META[service] ?? SERVICE_META.groq;

  const handleConfirm = useCallback(() => {
    const trimmed = token.trim();
    if (!trimmed) { return; }
    onConfirm(trimmed);
    setToken('');
    setShowToken(false);
  }, [token, onConfirm]);

  const handleCancel = useCallback(() => {
    setToken('');
    setShowToken(false);
    onCancel();
  }, [onCancel]);

  const canConfirm = token.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      {/* Backdrop — tap to dismiss */}
      <Pressable style={styles.backdrop} onPress={handleCancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kvContainer}
        >
          {/* Card — stop touch propagation so it doesn't dismiss */}
          <Pressable style={styles.card} onPress={() => {}}>

            {/* Icon + title */}
            <View style={styles.headerRow}>
              <Text style={styles.serviceIcon}>{meta.icon}</Text>
              <Text style={styles.title}>{meta.label} API Token</Text>
            </View>

            <Text style={styles.subtitle}>
              Enter your {meta.label} API token to use this service.{'\n'}
              Get one for free at{' '}
              <Text style={styles.link}>{meta.docsUrl}</Text>
            </Text>

            {/* Token input */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={token}
                onChangeText={setToken}
                placeholder={meta.placeholder}
                placeholderTextColor="#5A52A0"
                secureTextEntry={!showToken}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleConfirm}
                selectionColor="#7C6AF7"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowToken(v => !v)}
                activeOpacity={0.7}
                accessibilityLabel={showToken ? 'Hide token' : 'Show token'}
              >
                <Text style={styles.eyeIcon}>{showToken ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                activeOpacity={0.75}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, !canConfirm && styles.confirmDisabled]}
                onPress={handleConfirm}
                activeOpacity={0.75}
                disabled={!canConfirm}
              >
                <Text style={styles.confirmText}>Save &amp; Connect</Text>
              </TouchableOpacity>
            </View>

          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kvContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#1A1830',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A2550',
    // Shadow
    shadowColor: '#7C6AF7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  serviceIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E0DEFF',
    letterSpacing: 0.3,
  },

  subtitle: {
    fontSize: 13,
    color: '#9990D8',
    lineHeight: 20,
    marginBottom: 20,
  },
  link: {
    color: '#7C6AF7',
    textDecorationLine: 'underline',
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0D1F',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2550',
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 48,
    color: '#E0DEFF',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  eyeButton: {
    paddingLeft: 10,
    paddingVertical: 8,
  },
  eyeIcon: {
    fontSize: 18,
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F0D1F',
    borderWidth: 1,
    borderColor: '#2A2550',
  },
  cancelText: {
    color: '#9990D8',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C6AF7',
  },
  confirmDisabled: {
    backgroundColor: '#3A335A',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default TokenModal;
