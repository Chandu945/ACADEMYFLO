import { useRef, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { radius, shadows, spacing, springConfig } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { lightHaptic } from '../../utils/haptics';

type CardVariant = 'flat' | 'elevated' | 'outlined';

type AppCardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  variant?: CardVariant;
  style?: ViewStyle;
  testID?: string;
};

export function AppCard({ children, onPress, onLongPress, variant = 'flat', style, testID }: AppCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeCardStyles(colors), [colors]);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    lightHaptic();
    Animated.spring(scale, springConfig.press).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, springConfig.release).start();
  };

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        android_ripple={{ color: colors.border, borderless: false }}
        testID={testID}
      >
        <Animated.View style={[styles.base, styles[variant], style, { transform: [{ scale }] }]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Animated.View style={[styles.base, styles[variant], style]} testID={testID}>
      {children}
    </Animated.View>
  );
}

const makeCardStyles = (colors: Colors) => StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
  } as ViewStyle,
  flat: {
    ...shadows.sm,
  } as ViewStyle,
  elevated: {
    ...shadows.md,
  } as ViewStyle,
  outlined: {
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.none,
  } as ViewStyle,
});
