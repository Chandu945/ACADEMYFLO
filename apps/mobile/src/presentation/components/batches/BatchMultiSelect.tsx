import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import type { BatchListItem } from '../../../domain/batch/batch.types';
import { listBatches } from '../../../infra/batch/batch-api';
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
    async function load() {
      const result = await listBatches(1, 100);
      if (!mounted) return;
      if (result.ok && Array.isArray(result.value?.data)) {
        setBatches(result.value.data);
      }
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const toggle = useCallback(
    (batchId: string) => {
      if (selectedIds.includes(batchId)) {
        onChange(selectedIds.filter((id) => id !== batchId));
      } else {
        onChange([...selectedIds, batchId]);
      }
    },
    [selectedIds, onChange],
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
      <Text style={styles.label}>Batches</Text>
      <View style={styles.list}>
        {batches.map((batch) => {
          const isSelected = selectedIds.includes(batch.id);
          return (
            <Pressable
              key={batch.id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggle(batch.id)}
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
