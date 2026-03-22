import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import type { OwnerDashboardRange } from '../../../domain/dashboard/dashboard.types';
import { dateRangeSchema } from '../../../domain/dashboard/dashboard.schemas';
import { DatePickerInput } from '../ui/DatePickerInput';
import { fontSizes, fontWeights, radius, spacing } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type DashboardFiltersProps = {
  range: OwnerDashboardRange;
  onRangeChange: (range: OwnerDashboardRange) => void;
};

export function DashboardFilters({ range, onRangeChange }: DashboardFiltersProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [showCustom, setShowCustom] = useState(range.mode === 'custom');
  const [fromText, setFromText] = useState(range.mode === 'custom' ? range.from : '');
  const [toText, setToText] = useState(range.mode === 'custom' ? range.to : '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const switchToPreset = () => {
    setShowCustom(false);
    setValidationError(null);
    onRangeChange({ mode: 'preset', preset: 'THIS_MONTH' });
  };

  const switchToCustom = () => {
    setShowCustom(true);
    setValidationError(null);
  };

  const applyDateRange = () => {
    const parsed = dateRangeSchema.safeParse({ from: fromText, to: toText });
    if (!parsed.success) {
      setValidationError(parsed.error.errors[0]?.message ?? 'Invalid date range');
      return;
    }
    setValidationError(null);
    onRangeChange({ mode: 'custom', from: fromText, to: toText });
  };

  const isApplyEnabled = fromText.length > 0 && toText.length > 0;

  return (
    <View style={styles.container}>
      {/* Segmented control */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, !showCustom && styles.segmentActive]}
          onPress={switchToPreset}
          accessibilityRole="button"
          accessibilityState={{ selected: !showCustom }}
          testID="filter-this-month"
        >
          
          <AppIcon
            name="calendar-month-outline"
            size={16}
            color={!showCustom ? colors.white : colors.textSecondary}
          />
          <Text style={[styles.segmentText, !showCustom && styles.segmentTextActive]}>
            This Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, showCustom && styles.segmentActive]}
          onPress={switchToCustom}
          accessibilityRole="button"
          accessibilityState={{ selected: showCustom }}
          testID="filter-date-range"
        >
          
          <AppIcon
            name="calendar-range-outline"
            size={16}
            color={showCustom ? colors.white : colors.textSecondary}
          />
          <Text style={[styles.segmentText, showCustom && styles.segmentTextActive]}>
            Date Range
          </Text>
        </TouchableOpacity>
      </View>

      {/* Custom date inputs */}
      {showCustom && (
        <View style={styles.dateSection}>
          <View style={styles.dateFields}>
            <View style={styles.dateField}>
              <DatePickerInput
                label="From"
                value={fromText}
                onChange={setFromText}
                placeholder="Select start date"
                testID="input-from"
              />
            </View>
            <View style={styles.dateField}>
              <DatePickerInput
                label="To"
                value={toText}
                onChange={setToText}
                placeholder="Select end date"
                testID="input-to"
              />
            </View>
          </View>
          <TouchableOpacity
            style={[styles.applyButton, !isApplyEnabled && styles.applyDisabled]}
            onPress={applyDateRange}
            disabled={!isApplyEnabled}
            accessibilityRole="button"
            testID="apply-button"
          >
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>
      )}

      {validationError && (
        <Text style={styles.error} accessibilityRole="alert" testID="filter-error">
          {validationError}
        </Text>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.white,
  },
  dateSection: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateFields: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dateField: {
    flex: 1,
  },
  applyButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  applyDisabled: {
    opacity: 0.4,
  },
  applyText: {
    color: colors.white,
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.base,
  },
  error: {
    color: colors.danger,
    fontSize: fontSizes.sm,
    marginTop: spacing.sm,
  },
});
