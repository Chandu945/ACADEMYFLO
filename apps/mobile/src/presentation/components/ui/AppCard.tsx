import { useRef, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { radius, shadows, spacing } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type AppCardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  testID?: string;
};

export function AppCard({ children, onPress, onLongPress, style, testID }: AppCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeCardStyles(colors), [colors]);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.985,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={{ color: colors.border, borderless: false }}
        testID={testID}
      >
        <Animated.View style={[styles.base, style, { transform: [{ scale }] }]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Animated.View style={[styles.base, style]} testID={testID}>
      {children}
    </Animated.View>
  );
}

const makeCardStyles = (colors: Colors) => StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    ...shadows.sm,
  } as ViewStyle,
  elevated: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    ...shadows.md,
  } as ViewStyle,
});
