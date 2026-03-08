import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

type MonthPickerRowProps = {
  month: string;
  onPrevious: () => void;
  onNext: () => void;
};

function formatMonth(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function MonthPickerRow({ month, onPrevious, onNext }: MonthPickerRowProps) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onPrevious} style={styles.arrow} testID="month-prev">
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="chevron-left" size={20} color={colors.primary} />
      </Pressable>
      <View style={styles.monthContainer}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="calendar-month" size={16} color={colors.primary} />
        <Text style={styles.monthText} testID="month-display">
          {formatMonth(month)}
        </Text>
      </View>
      <Pressable onPress={onNext} style={styles.arrow} testID="month-next">
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="chevron-right" size={20} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  monthText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
});
