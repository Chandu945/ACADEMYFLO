import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

import { colors, spacing, radius, shadows } from '../../theme';

export function SkeletonTile() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
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

const styles = StyleSheet.create({
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
