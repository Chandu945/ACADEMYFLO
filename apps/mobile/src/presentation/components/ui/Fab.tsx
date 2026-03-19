import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type FabProps = {
  label: string;
  onPress: () => void;
  testID?: string;
};

export function Fab({ label, onPress, testID }: FabProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, insets.bottom), [colors, insets.bottom]);
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: Colors, bottomInset: number) => StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: bottomInset + spacing.xl,
    right: spacing.base,
    left: spacing.base,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.base,
    alignItems: 'center',
    ...shadows.md,
  },
  text: {
    color: colors.white,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
  },
});
