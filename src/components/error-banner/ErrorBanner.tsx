import React, { memo } from 'react';
import { IErrorBannerProps } from '../../types';
import { styles } from '../../screens/ChatScreen.style';
import { Text, TouchableOpacity } from 'react-native';

const ErrorBanner: React.FC<IErrorBannerProps> = ({ message, onDismiss }) => (
  <TouchableOpacity style={styles.errorBanner} onPress={onDismiss}>
    <Text style={styles.errorText}>⚠ {message} · Tap to dismiss</Text>
  </TouchableOpacity>
);

export default memo(ErrorBanner);
