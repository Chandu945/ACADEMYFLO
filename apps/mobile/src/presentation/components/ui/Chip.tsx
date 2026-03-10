import React, { useMemo } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
};

export function Chip({ label, selected, onPress, testID }: ChipProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  chip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.base,
    borderRadius: radius.xl,
    backgroundColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textMedium,
  },
  labelSelected: {
    color: colors.white,
  },
});
