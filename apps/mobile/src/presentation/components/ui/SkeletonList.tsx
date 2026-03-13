import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

import { spacing, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type SkeletonListProps = {
  count?: number;
  showAvatar?: boolean;
};

export function SkeletonList({ count = 3, showAvatar = true }: SkeletonListProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
    <Animated.View style={{ opacity }} accessibilityLabel="Loading" testID="skeleton-list">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.row}>
          {showAvatar && <View style={styles.avatar} />}
          <View style={styles.textGroup}>
            <View style={styles.titleBar} />
            <View style={styles.subtitleBar} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgSubtle,
  },
  textGroup: {
    flex: 1,
    gap: spacing.sm,
  },
  titleBar: {
    width: '60%',
    height: 14,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.sm,
  },
  subtitleBar: {
    width: '40%',
    height: 10,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.sm,
  },
});
