import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

interface BlinkingCursorProps {
  color?: string;
  fontSize?: number;
}

const BlinkingCursor: React.FC<BlinkingCursorProps> = ({
  color = '#7C6AF7',
  fontSize = 16,
}) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 530,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 530,
          useNativeDriver: true,
        }),
      ]),
    );
    blink.start();
    return () => blink.stop();
  }, [opacity]);

  return (
    <Animated.Text
      style={[styles.cursor, { opacity, color, fontSize }]}
      accessibilityElementsHidden
    >
      ▍
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  cursor: {
    lineHeight: 22,
    includeFontPadding: false,
  },
});

export default BlinkingCursor;
