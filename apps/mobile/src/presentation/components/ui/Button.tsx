import React, { useRef, useMemo } from 'react';
import {
  Pressable,
  Animated,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {
  spacing,
  fontSizes,
  fontWeights,
  radius,
  disabledOpacity,
  springConfig,
  letterSpacing as ls,
  gradient,
} from '../../theme';
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
  accessibilityLabel?: string;
};

function getBgColors(colors: Colors): Record<ButtonVariant, string> {
  return {
    // primary uses a LinearGradient overlay instead of a solid bg — see below.
    primary: 'transparent',
    secondary: colors.bgSubtle,
    danger: colors.danger,
  };
}

function getTextColors(colors: Colors): Record<ButtonVariant, string> {
  return {
    primary: colors.white,
    secondary: colors.text,
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
  accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const BG_COLORS = useMemo(() => getBgColors(colors), [colors]);
  const TEXT_COLORS = useMemo(() => getTextColors(colors), [colors]);
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (isDisabled) return;
    lightHaptic();
    Animated.spring(scale, springConfig.press).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, springConfig.release).start();
  };

  const isPrimary = variant === 'primary';

  const inner = loading ? (
    <ActivityIndicator color={TEXT_COLORS[variant]} size="small" />
  ) : (
    <Text
      style={[styles.text, size === 'sm' && styles.textSm, { color: TEXT_COLORS[variant] } as TextStyle]}
    >
      {title}
    </Text>
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.base,
          size === 'sm' && styles.baseSm,
          !isPrimary && ({ backgroundColor: BG_COLORS[variant] } as ViewStyle),
          isPrimary && styles.baseGradientWrap,
          isDisabled && styles.disabled,
          { transform: [{ scale }] },
        ]}
      >
        {isPrimary ? (
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            // 135deg ≈ top-left to bottom-right.
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View style={styles.contentWrap}>{inner}</View>
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
  baseGradientWrap: {
    overflow: 'hidden',
  },
  contentWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: disabledOpacity,
  },
  text: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    letterSpacing: ls.wide,
  },
  textSm: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    letterSpacing: ls.normal,
  },
});
