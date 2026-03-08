import React, { useRef } from 'react';
import {
  Pressable,
  Animated,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
};

const BG_COLORS: Record<ButtonVariant, string> = {
  primary: colors.primary,
  secondary: colors.border,
  danger: colors.danger,
};

const TEXT_COLORS: Record<ButtonVariant, string> = {
  primary: colors.white,
  secondary: colors.textMedium,
  danger: colors.white,
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
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
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.base,
          { backgroundColor: BG_COLORS[variant] } as ViewStyle,
          isDisabled && styles.disabled,
          { transform: [{ scale }] },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={TEXT_COLORS[variant]} size="small" />
        ) : (
          <Text style={[styles.text, { color: TEXT_COLORS[variant] } as TextStyle]}>{title}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
  },
});
