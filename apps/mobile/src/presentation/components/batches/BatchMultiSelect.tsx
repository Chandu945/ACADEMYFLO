import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppIcon } from '../ui/AppIcon';
import type { BatchListItem } from '../../../domain/batch/batch.types';
import { getBatchesCached } from '../../../infra/batch/batch-cache';
import { fontSizes, fontWeights, radius, spacing, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type BatchMultiSelectProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Batch IDs the student was already enrolled in BEFORE this edit session
   *  began. Used to distinguish "currently enrolled" from "newly selected"
   *  and to label the remove affordance correctly. */
  initiallyEnrolledIds?: string[];
};

export function BatchMultiSelect({
  selectedIds,
  onChange,
  initiallyEnrolledIds,
}: BatchMultiSelectProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getBatchesCached()
      .then((items) => {
        if (mounted) setBatches(items);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Read selectedIds through a ref so `toggle` stays stable across re-renders.
  // Otherwise every parent render with a new selectedIds array would recreate
  // toggle and any memoized downstream components (rows) would churn.
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const toggle = useCallback(
    (batchId: string) => {
      const ids = selectedIdsRef.current;
      if (ids.includes(batchId)) {
        onChange(ids.filter((id) => id !== batchId));
      } else {
        onChange([...ids, batchId]);
      }
    },
    [onChange],
  );

  // Hide batches that are at maximum capacity, EXCEPT ones the student is
  // already a member of (so editing a student doesn't silently drop their
  // assignment to a now-full batch). `maxStudents == null` means unlimited
  // and is always shown. Re-computed when `batches` or `selectedIds`
  // change — the latter so an already-enrolled full batch becomes visible
  // as soon as edit-mode populates the initial selection.
  const visibleBatches = useMemo(() => {
    return batches.filter((b) => {
      const isFull = b.maxStudents != null && b.studentCount >= b.maxStudents;
      if (!isFull) return true;
      return selectedIds.includes(b.id);
    });
  }, [batches, selectedIds]);

  // CRITICAL: this hook MUST be declared before any early returns below.
  // Putting it after the loading/empty-state branches violated the Rules
  // of Hooks — when batches loaded asynchronously, the first render hit
  // an early return (no hook), the second render passed all the early
  // returns and called the hook (one extra hook), and React threw
  // "Rendered more hooks than during the previous render".
  const initiallyEnrolledSet = useMemo(
    () => new Set(initiallyEnrolledIds ?? []),
    [initiallyEnrolledIds],
  );

  const selectedCount = selectedIds.length;

  // Header is the same in every render branch so the section feels stable.
  const header = (
    <View style={styles.header}>
      <Text
        style={styles.sectionTitle}
        accessibilityRole="header"
        accessibilityLabel={
          selectedCount === 0
            ? 'Batches, none selected'
            : `Batches, ${selectedCount} selected`
        }
      >
        Batches
      </Text>
      {selectedCount > 0 ? (
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{selectedCount}</Text>
        </View>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.section}>
        {header}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (batches.length === 0) {
    return (
      <View style={styles.section}>
        {header}
        <Text style={styles.helperText}>
          No batches created yet. Add a batch first to enrol students.
        </Text>
      </View>
    );
  }

  if (visibleBatches.length === 0) {
    return (
      <View style={styles.section}>
        {header}
        <Text style={styles.helperText}>
          All batches are at capacity. Increase a batch&apos;s maximum students
          before assigning here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {header}
      <Text style={styles.helperText}>
        Selected batches are enrolled. Tap a selected batch to remove it.
      </Text>
      <View
        style={styles.list}
        accessibilityRole="radiogroup"
        accessibilityLabel="Select batches"
      >
        {visibleBatches.map((batch) => {
          const isSelected = selectedIds.includes(batch.id);
          const wasInitiallyEnrolled = initiallyEnrolledSet.has(batch.id);
          const daysSummary = formatDays(batch.days);
          const capacitySummary =
            batch.maxStudents != null
              ? `${batch.studentCount}/${batch.maxStudents}`
              : null;
          const accessibilityHint = [
            wasInitiallyEnrolled ? 'currently enrolled' : null,
            daysSummary,
            capacitySummary,
            isSelected ? 'tap to remove' : 'tap to enrol',
          ]
            .filter(Boolean)
            .join(', ');
          return (
            <Pressable
              key={batch.id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggle(batch.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={batch.batchName}
              accessibilityHint={accessibilityHint || undefined}
              testID={`batch-select-${batch.id}`}
            >
              {isSelected ? (
                <LinearGradient
                  colors={[gradient.start, gradient.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <View style={styles.chipBody}>
                <View style={styles.chipNameRow}>
                  {isSelected ? (
                    <AppIcon name="check" size={14} color="#FFFFFF" />
                  ) : null}
                  <Text
                    style={[styles.chipName, isSelected && styles.chipNameSelected]}
                    numberOfLines={1}
                  >
                    {batch.batchName}
                  </Text>
                  {wasInitiallyEnrolled && isSelected ? (
                    <View style={styles.enrolledTag}>
                      <Text style={styles.enrolledTagText}>ENROLLED</Text>
                    </View>
                  ) : null}
                </View>
                {daysSummary ? (
                  <Text
                    style={[styles.chipMeta, isSelected && styles.chipMetaSelected]}
                    numberOfLines={1}
                  >
                    {daysSummary}
                  </Text>
                ) : null}
              </View>
              {isSelected ? (
                <View style={styles.removeBadge}>
                  <AppIcon name="close" size={14} color="#FFFFFF" />
                </View>
              ) : capacitySummary ? (
                <View style={styles.capacityBadge}>
                  <Text style={styles.capacityBadgeText}>{capacitySummary}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Mon–Sun → "M T W". Compact letter form so the schedule hint fits inside
// a chip without wrapping. Order is calendar-week (M..Sun) regardless of
// how the days array was stored, so the schedule reads naturally.
const WEEK_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
const DAY_INITIAL: Record<string, string> = {
  MON: 'M',
  TUE: 'T',
  WED: 'W',
  THU: 'T',
  FRI: 'F',
  SAT: 'S',
  SUN: 'S',
};

function formatDays(days: readonly string[] | undefined | null): string {
  if (!days || days.length === 0) return '';
  if (days.length === 7) return 'Every day';
  const set = new Set(days);
  return WEEK_ORDER.filter((d) => set.has(d))
    .map((d) => DAY_INITIAL[d])
    .join(' ');
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    // Section wrapper — gives the picker its own breathing room and matches
    // the spacing rhythm of the other form sections (which have their own
    // sectionTitle styled at the same scale).
    section: {
      marginTop: spacing.lg,
      marginBottom: spacing.base,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    sectionTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    // Pill-shaped count badge that appears next to the title once the user
    // has selected at least one batch — gives quick feedback without
    // pushing layout when zero are selected.
    countBadge: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 7,
      borderRadius: 11,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countBadgeText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.bold,
      color: colors.white,
      letterSpacing: 0.2,
    },
    helperText: {
      fontSize: fontSizes.sm,
      color: colors.textMedium,
      marginBottom: spacing.md,
    },
    list: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    // Chip is now a small two-row card: name + day-letters on the left,
    // capacity pill on the right. Wider min/max because the metadata
    // makes the previous narrow pill cramped.
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minWidth: 140,
      maxWidth: '100%',
      paddingLeft: spacing.md,
      paddingRight: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.bgSubtle,
      overflow: 'hidden',
    },
    chipSelected: {
      borderColor: 'transparent',
    },
    chipBody: {
      flexShrink: 1,
      gap: 2,
    },
    chipNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    chipName: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.bold,
      color: colors.text,
      flexShrink: 1,
    },
    chipNameSelected: {
      color: '#FFFFFF',
      letterSpacing: 0.1,
    },
    // Days summary — small and muted in default state, nearly-white at
    // 80% opacity in selected state so it stays readable on the gradient
    // without competing with the bold name.
    chipMeta: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: colors.textSecondary,
      letterSpacing: 1,
    },
    chipMetaSelected: {
      color: 'rgba(255, 255, 255, 0.85)',
    },
    // Capacity pill (right side of chip) — solid surface fill in default
    // state for clear contrast against the muted chip body, and a
    // semi-transparent white in selected state so it reads on the gradient.
    capacityBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    capacityBadgeSelected: {
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      borderColor: 'rgba(255, 255, 255, 0.32)',
    },
    capacityBadgeText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.bold,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    capacityBadgeTextSelected: {
      color: '#FFFFFF',
    },
    // Explicit "remove" affordance shown on the right of selected chips.
    // The whole chip is still tappable, but a clear × icon makes the action
    // obvious — no more "do I tap to confirm or to remove?" ambiguity.
    removeBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.32)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    // "ENROLLED" tag — only shown for batches the student was already in
    // BEFORE this edit session. Distinguishes "currently enrolled (will
    // stay)" from "newly added in this session (will be added on save)".
    enrolledTag: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.20)',
    },
    enrolledTagText: {
      fontSize: 9,
      fontWeight: fontWeights.bold,
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    loadingContainer: {
      paddingVertical: spacing.base,
      alignItems: 'center',
    },
  });
