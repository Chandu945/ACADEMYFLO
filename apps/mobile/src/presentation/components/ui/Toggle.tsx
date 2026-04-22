import React, { useEffect, useRef, useMemo } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { radius, disabledOpacity, springConfig, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { lightHaptic } from '../../utils/haptics';

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
      ...springConfig.toggle,
    }).start();
  }, [value, translateX]);

  return (
    <Pressable
      style={[styles.track, value && styles.trackOn, disabled && styles.disabled]}
      onPress={() => {
        if (disabled) return;
        lightHaptic();
        onValueChange(!value);
      }}
      hitSlop={{ top: 10, bottom: 10 }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {value ? (
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
    </Pressable>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  track: {
    width: 44,
    height: 24,
    borderRadius: radius.lg,
    backgroundColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  trackOn: {
    overflow: 'hidden',
  },
  disabled: {
    opacity: disabledOpacity,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
});
