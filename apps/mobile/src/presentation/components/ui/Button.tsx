import React, { useRef, useMemo } from 'react';
import {
  Pressable,
  Animated,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { lightHaptic } from '../../utils/haptics';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'default' | 'sm';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
};

function getBgColors(colors: Colors): Record<ButtonVariant, string> {
  return {
    primary: colors.primary,
    secondary: colors.border,
    danger: colors.danger,
  };
}

function getTextColors(colors: Colors): Record<ButtonVariant, string> {
  return {
    primary: colors.white,
    secondary: colors.textMedium,
    danger: colors.white,
  };
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const BG_COLORS = useMemo(() => getBgColors(colors), [colors]);
  const TEXT_COLORS = useMemo(() => getTextColors(colors), [colors]);
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    lightHaptic();
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.base,
          size === 'sm' && styles.baseSm,
          { backgroundColor: BG_COLORS[variant] } as ViewStyle,
          isDisabled && styles.disabled,
          { transform: [{ scale }] },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={TEXT_COLORS[variant]} size="small" />
        ) : (
          <Text style={[styles.text, size === 'sm' && styles.textSm, { color: TEXT_COLORS[variant] } as TextStyle]}>{title}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = (_colors: Colors) => StyleSheet.create({
  base: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  baseSm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    borderRadius: radius.md,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.3,
  },
  textSm: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0,
  },
});
