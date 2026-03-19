import React, { useMemo } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type SegmentedControlProps = {
  segments: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  testID?: string;
};

export function SegmentedControl({
  segments,
  selectedIndex,
  onSelect,
  testID,
}: SegmentedControlProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container} testID={testID} accessibilityRole="tablist">
      {segments.map((label, index) => (
        <Pressable
          key={label}
          style={[styles.segment, selectedIndex === index && styles.segmentSelected]}
          onPress={() => onSelect(index)}
          accessibilityRole="tab"
          accessibilityState={{ selected: selectedIndex === index }}
          testID={`segment-${index}`}
        >
          <Text style={[styles.label, selectedIndex === index && styles.labelSelected]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.xl,
    padding: 4,
    marginBottom: spacing.md,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm + 3,
    alignItems: 'center',
    borderRadius: radius.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.surface,
    ...shadows.sm,
    elevation: 3,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
});
