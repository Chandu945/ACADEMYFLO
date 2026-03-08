import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

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
  return (
    <View style={styles.container} testID={testID}>
      {segments.map((label, index) => (
        <Pressable
          key={label}
          style={[styles.segment, selectedIndex === index && styles.segmentSelected]}
          onPress={() => onSelect(index)}
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.lg,
    padding: 3,
    marginBottom: spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
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
