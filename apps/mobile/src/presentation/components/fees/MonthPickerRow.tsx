import React, { memo, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

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

function MonthPickerRowComponent({ month, onPrevious, onNext }: MonthPickerRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Pressable onPress={onPrevious} style={styles.arrow} testID="month-prev">
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <AppIcon name="chevron-left" size={20} color="#FFFFFF" />
      </Pressable>
      <View style={styles.monthContainer}>
        
        <AppIcon name="calendar-month" size={16} color={colors.textSecondary} />
        <Text style={styles.monthText} testID="month-display">
          {formatMonth(month)}
        </Text>
      </View>
      <Pressable onPress={onNext} style={styles.arrow} testID="month-next">
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <AppIcon name="chevron-right" size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

export const MonthPickerRow = memo(MonthPickerRowComponent);

const makeStyles = (colors: Colors) => StyleSheet.create({
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
    overflow: 'hidden',
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
