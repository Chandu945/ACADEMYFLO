import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { OwnerDashboardRange } from '../../../domain/dashboard/dashboard.types';
import { dateRangeSchema } from '../../../domain/dashboard/dashboard.schemas';
import { colors, fontSizes, fontWeights, radius, spacing } from '../../theme';

type DashboardFiltersProps = {
  range: OwnerDashboardRange;
  onRangeChange: (range: OwnerDashboardRange) => void;
};

const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function DashboardFilters({ range, onRangeChange }: DashboardFiltersProps) {
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

  const isApplyEnabled = LOCAL_DATE_RE.test(fromText) && LOCAL_DATE_RE.test(toText);

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
          {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
          <Icon
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
          {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
          <Icon
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
              <Text style={styles.dateLabel}>From</Text>
              <View style={styles.inputWrapper}>
                {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                <Icon name="calendar-outline" size={16} color={colors.textDisabled} />
                <TextInput
                  style={styles.dateInput}
                  value={fromText}
                  onChangeText={setFromText}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textDisabled}
                  maxLength={10}
                  testID="input-from"
                  accessibilityLabel="From date"
                />
              </View>
            </View>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>To</Text>
              <View style={styles.inputWrapper}>
                {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                <Icon name="calendar-outline" size={16} color={colors.textDisabled} />
                <TextInput
                  style={styles.dateInput}
                  value={toText}
                  onChangeText={setToText}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textDisabled}
                  maxLength={10}
                  testID="input-to"
                  accessibilityLabel="To date"
                />
              </View>
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

const styles = StyleSheet.create({
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
  dateLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg,
    gap: spacing.sm,
  },
  dateInput: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.text,
    padding: 0,
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
