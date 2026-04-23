import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import LinearGradient from 'react-native-linear-gradient';
import { AUDIT_ACTION_TYPES, AUDIT_ENTITY_TYPES } from '@academyflo/contracts';
import type { AuditFilters as AuditFiltersType } from '../../../application/audit/use-audit-logs';
import { DatePickerInput } from '../ui/DatePickerInput';
import { fontSizes, fontWeights, radius, spacing, gradient } from '../../theme';
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

  const hasAnyFilter =
    !!filters.from || !!filters.to || !!filters.action || !!filters.entityType;

  return (
    <View style={styles.container} testID="audit-filters">
      {/* ── Date Range ──────────────────────────────── */}
      <SectionHeader icon="calendar-range" title="Date Range" colors={colors} styles={styles} />
      {/* Stacked vertically so the full date label can render without
          truncating to "16 Apr ..." in the narrower modal width. */}
      <View style={styles.dateStack}>
        <DatePickerInput
          label="From"
          value={filters.from}
          onChange={(v) => onChange({ ...filters, from: v })}
          placeholder="Select start date"
          testID="filter-from"
        />
        <DatePickerInput
          label="To"
          value={filters.to}
          onChange={(v) => onChange({ ...filters, to: v })}
          placeholder="Select end date"
          testID="filter-to"
        />
      </View>

      {!rangeValid && (
        <View style={styles.errorRow}>
          <AppIcon name="alert-circle-outline" size={14} color={colors.danger} />
          <Text style={styles.errorHint} testID="filter-range-error">
            From must be before To
          </Text>
        </View>
      )}

      {/* ── Action Type ─────────────────────────────── */}
      <SectionHeader
        icon="lightning-bolt-outline"
        title="Action Type"
        colors={colors}
        styles={styles}
      />
      <View style={styles.chipsWrap} testID="action-type-options">
        {ACTION_OPTIONS.map((opt) => {
          const active = filters.action === opt.value;
          return (
            <FilterChip
              key={opt.value || 'ALL'}
              label={opt.label}
              active={active}
              onPress={() =>
                onChange({ ...filters, action: opt.value as AuditFiltersType['action'] })
              }
              testID={`action-opt-${opt.value || 'ALL'}`}
              styles={styles}
              colors={colors}
            />
          );
        })}
      </View>

      {/* ── Entity Type ─────────────────────────────── */}
      <SectionHeader
        icon="shape-outline"
        title="Entity Type"
        colors={colors}
        styles={styles}
      />
      <View style={styles.chipsWrap} testID="entity-type-options">
        {ENTITY_OPTIONS.map((opt) => {
          const active = filters.entityType === opt.value;
          return (
            <FilterChip
              key={opt.value || 'ALL'}
              label={opt.label}
              active={active}
              onPress={() =>
                onChange({ ...filters, entityType: opt.value as AuditFiltersType['entityType'] })
              }
              testID={`entity-opt-${opt.value || 'ALL'}`}
              styles={styles}
              colors={colors}
            />
          );
        })}
      </View>

      {/* ── Apply (primary) + Clear (text link) ─────── */}
      <TouchableOpacity
        style={[styles.applyBtn, !canApply && styles.applyBtnDisabled]}
        onPress={onApply}
        disabled={!canApply}
        activeOpacity={0.85}
        testID="filter-apply"
      >
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <AppIcon name="filter-check-outline" size={18} color="#FFFFFF" />
        <Text style={styles.applyBtnText}>Apply Filters</Text>
      </TouchableOpacity>

      {hasAnyFilter && (
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={onClear}
          activeOpacity={0.7}
          testID="filter-clear"
        >
          <AppIcon name="filter-remove-outline" size={16} color={colors.danger} />
          <Text style={styles.clearBtnText}>Clear all filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

type SectionHeaderProps = {
  icon: string;
  title: string;
  colors: Colors;
  styles: ReturnType<typeof makeStyles>;
};

function SectionHeader({ icon, title, colors, styles }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <AppIcon name={icon} size={14} color={colors.textSecondary} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

type FilterChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
  styles: ReturnType<typeof makeStyles>;
  colors: Colors;
};

function FilterChip({ label, active, onPress, testID, styles, colors }: FilterChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      testID={testID}
      activeOpacity={0.75}
    >
      {active ? (
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {active && <AppIcon name="check" size={12} color="#FFFFFF" />}
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      // No card background — this lives inside a modal dialog that already
      // provides the surface, so a nested card would feel heavy.
      gap: spacing.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs + 2,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    sectionIconWrap: {
      width: 22,
      height: 22,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bgSubtle,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: fontWeights.bold,
      color: colors.textSecondary,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    dateStack: {
      gap: spacing.sm,
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
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs + 2,
      paddingTop: 2,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.bgSubtle,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 7,
      overflow: 'hidden',
    },
    chipActive: {
      borderColor: 'transparent',
    },
    chipText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: fontWeights.semibold,
      letterSpacing: 0.2,
    },
    chipTextActive: {
      color: '#FFFFFF',
    },
    applyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      height: 50,
      borderRadius: radius.full,
      overflow: 'hidden',
      marginTop: spacing.lg,
    },
    applyBtnDisabled: {
      opacity: 0.5,
    },
    applyBtnText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.bold,
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    clearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: spacing.md,
      marginTop: spacing.xs,
    },
    clearBtnText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.danger,
    },
  });
