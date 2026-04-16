import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import type { BatchListItem } from '../../../domain/batch/batch.types';
import { getBatchesCached } from '../../../infra/batch/batch-cache';
import { fontSizes, fontWeights, radius, spacing } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type BatchMultiSelectProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function BatchMultiSelect({ selectedIds, onChange }: BatchMultiSelectProps) {
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (batches.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No batches created yet</Text>
      </View>
    );
  }

  return (
    <View>
      <Text
        style={styles.label}
        accessibilityRole="header"
        accessibilityLabel={
          selectedIds.length === 0
            ? 'Batches, none selected'
            : `Batches, ${selectedIds.length} selected`
        }
      >
        Batches
      </Text>
      <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="Select batches">
        {batches.map((batch) => {
          const isSelected = selectedIds.includes(batch.id);
          return (
            <Pressable
              key={batch.id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggle(batch.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={batch.batchName}
              testID={`batch-select-${batch.id}`}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {batch.batchName}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
  list: {
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
    backgroundColor: colors.primary,
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
  loadingContainer: {
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: spacing.base,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textDisabled,
  },
});
