import React, { useEffect, useRef, useMemo } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';

import { radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type ToggleProps = {
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
};

export function Toggle({
  value,
  onValueChange,
  disabled = false,
  testID,
  accessibilityLabel,
}: ToggleProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const translateX = useRef(new Animated.Value(value ? 20 : 0)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? 20 : 0,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [value, translateX]);

  return (
    <Pressable
      style={[styles.track, value && styles.trackOn, disabled && styles.disabled]}
      onPress={() => !disabled && onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
    </Pressable>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  track: {
    width: 44,
    height: 24,
    borderRadius: radius.lg,
    backgroundColor: colors.borderStrong,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  trackOn: {
    backgroundColor: colors.primary,
  },
  disabled: {
    opacity: 0.4,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
});
