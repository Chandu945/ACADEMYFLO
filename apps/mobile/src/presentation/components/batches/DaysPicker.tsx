import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { Weekday } from '../../../domain/batch/batch.types';
import { fontSizes, fontWeights, radius, spacing, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const ALL_DAYS: { label: string; value: Weekday }[] = [
  { label: 'Mon', value: 'MON' },
  { label: 'Tue', value: 'TUE' },
  { label: 'Wed', value: 'WED' },
  { label: 'Thu', value: 'THU' },
  { label: 'Fri', value: 'FRI' },
  { label: 'Sat', value: 'SAT' },
  { label: 'Sun', value: 'SUN' },
];

type DaysPickerProps = {
  selected: Weekday[];
  onChange: (days: Weekday[]) => void;
  error?: string;
};

export function DaysPicker({ selected, onChange, error }: DaysPickerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const toggle = (day: Weekday) => {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day]);
    }
  };

  return (
    <View>
      <Text style={styles.label} accessibilityRole="header">
        Days
      </Text>
      <View
        style={styles.row}
        accessibilityRole="radiogroup"
        accessibilityLabel="Days of the week"
      >
        {ALL_DAYS.map((day) => {
          const isSelected = selected.includes(day.value);
          return (
            <Pressable
              key={day.value}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggle(day.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={day.label}
              testID={`day-${day.value.toLowerCase()}`}
            >
              {isSelected ? (
                <LinearGradient
                  colors={[gradient.start, gradient.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {day.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  label: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.textMedium,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    overflow: 'hidden',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textMedium,
  },
  chipTextSelected: {
    color: colors.white,
  },
  error: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    marginTop: -spacing.md,
    marginBottom: spacing.base,
  },
});
