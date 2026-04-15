import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, Platform, StyleSheet } from 'react-native';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

import { spacing, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export function SkeletonTile() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.tile, { opacity }]}
      accessibilityLabel="Loading"
      testID="skeleton-tile"
    >
      <View style={styles.iconBar} />
      <View style={styles.valueBar} />
      <View style={styles.labelBar} />
    </Animated.View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    minHeight: 100,
    margin: spacing.xs,
    ...shadows.sm,
  },
  iconBar: {
    width: 32,
    height: 32,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  valueBar: {
    width: '45%',
    height: 22,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  labelBar: {
    width: '65%',
    height: 12,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.sm,
  },
});
