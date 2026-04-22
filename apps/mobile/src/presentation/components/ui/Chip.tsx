import React, { useMemo } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
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
      {selected ? (
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  chip: {
    paddingVertical: 10,
    paddingHorizontal: spacing.base,
    minHeight: 44,
    borderRadius: radius.xl,
    backgroundColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: {
    overflow: 'hidden',
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
