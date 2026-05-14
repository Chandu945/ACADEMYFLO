import { useRef, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, View, Platform, type ViewStyle } from 'react-native';

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
    // BUG-015: on web, Pressable + accessibilityRole="button" renders as
    // a native <button>. If the card contains an action Pressable (like a
    // Staff row with an Activate button), that nests <button> inside
    // <button>, which is invalid HTML and triggers a React warning. On
    // web we render an interactive View (a <div role="button">) so the
    // inner action buttons remain the only real <button> elements.
    if (Platform.OS === 'web') {
      // We intentionally avoid `accessibilityRole="button"` here because
      // react-native-web converts that to a native <button>, which would
      // nest under/around inner action <button>s (Activate, Edit, etc.).
      // Instead we pass `role="button"` as a raw DOM attribute, so the
      // outer becomes a <div role="button"> and the inner Pressables
      // stay as the only real <button> elements (valid DOM, screen
      // readers still announce both correctly).
      const webHandlers: Record<string, unknown> = {
        onClick: onPress,
        onMouseDown: handlePressIn,
        onMouseUp: handlePressOut,
        onMouseLeave: handlePressOut,
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e: { key: string; preventDefault: () => void }) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPress?.();
          }
        },
      };
      return (
        // @ts-expect-error react-native-web View accepts raw DOM props
        <View {...webHandlers} testID={testID}>
          <Animated.View style={[styles.base, styles[variant], style, { transform: [{ scale }] }]}>
            {children}
          </Animated.View>
        </View>
      );
    }
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
