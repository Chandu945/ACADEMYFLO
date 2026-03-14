import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AUDIT_ACTION_TYPES, AUDIT_ENTITY_TYPES } from '@playconnect/contracts';
import type { AuditFilters as AuditFiltersType } from '../../../application/audit/use-audit-logs';
import { Button } from '../ui/Button';
import { DatePickerInput } from '../ui/DatePickerInput';
import { fontSizes, fontWeights, radius, shadows, spacing } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const ACTION_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Actions', value: '' },
  ...AUDIT_ACTION_TYPES.map((a) => ({
    label: a.replace(/_/g, ' '),
    value: a,
  })),
];

const ENTITY_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Entities', value: '' },
  ...AUDIT_ENTITY_TYPES.map((e) => ({
    label: e.replace(/_/g, ' '),
    value: e,
  })),
];

type AuditFiltersProps = {
  filters: AuditFiltersType;
  onChange: (f: AuditFiltersType) => void;
  onApply: () => void;
  onClear: () => void;
};

export function AuditFiltersPanel({ filters, onChange, onApply, onClear }: AuditFiltersProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const fromValid = !filters.from || /^\d{4}-\d{2}-\d{2}$/.test(filters.from);
  const toValid = !filters.to || /^\d{4}-\d{2}-\d{2}$/.test(filters.to);
  const rangeValid =
    !filters.from || !filters.to || filters.from <= filters.to;
  const canApply = fromValid && toValid && rangeValid;

  return (
    <View style={styles.container} testID="audit-filters">
      {/* ── Date Range ──────────────────────────────── */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="calendar-range" size={16} color={colors.textSecondary} />
        <Text style={styles.sectionTitle}>Date Range</Text>
      </View>
      <View style={styles.dateRow}>
        <View style={styles.field}>
          <DatePickerInput
            label="From"
            value={filters.from}
            onChange={(v) => onChange({ ...filters, from: v })}
            placeholder="Select start date"
            testID="filter-from"
          />
        </View>
        <View style={styles.field}>
          <DatePickerInput
            label="To"
            value={filters.to}
            onChange={(v) => onChange({ ...filters, to: v })}
            placeholder="Select end date"
            testID="filter-to"
          />
        </View>
      </View>

      {!rangeValid && (
        <View style={styles.errorRow}>
          {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
          <Icon name="alert-circle-outline" size={14} color={colors.danger} />
          <Text style={styles.errorHint} testID="filter-range-error">
            From must be before To
          </Text>
        </View>
      )}

      {/* ── Action Type ─────────────────────────────── */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="lightning-bolt-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.sectionTitle}>Action Type</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
        testID="action-type-options"
      >
        {ACTION_OPTIONS.map((opt) => {
          const active = filters.action === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange({ ...filters, action: opt.value as AuditFiltersType['action'] })}
              testID={`action-opt-${opt.value || 'ALL'}`}
              activeOpacity={0.7}
            >
              {active && (
                // @ts-expect-error react-native-vector-icons types incompatible with @types/react@19
                <Icon name="check-circle" size={14} color={colors.white} />
              )}
              <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Entity Type ─────────────────────────────── */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="shape-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.sectionTitle}>Entity Type</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
        testID="entity-type-options"
      >
        {ENTITY_OPTIONS.map((opt) => {
          const active = filters.entityType === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange({ ...filters, entityType: opt.value as AuditFiltersType['entityType'] })}
              testID={`entity-opt-${opt.value || 'ALL'}`}
              activeOpacity={0.7}
            >
              {active && (
                // @ts-expect-error react-native-vector-icons types incompatible with @types/react@19
                <Icon name="check-circle" size={14} color={colors.white} />
              )}
              <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Buttons ─────────────────────────────────── */}
      <View style={styles.buttonRow}>
        <View style={styles.btnWrap}>
          <Button title="Apply" onPress={onApply} disabled={!canApply} testID="filter-apply" />
        </View>
        <View style={styles.btnWrap}>
          <Button title="Clear" onPress={onClear} variant="secondary" testID="filter-clear" />
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  field: {
    flex: 1,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  errorHint: {
    fontSize: fontSizes.sm,
    color: colors.danger,
  },
  chipScroll: {
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    fontWeight: fontWeights.medium,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: fontWeights.semibold,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btnWrap: {
    flex: 1,
  },
});
