import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import type { BatchListItem } from '../../../domain/batch/batch.types';
import { listBatches } from '../../../infra/batch/batch-api';
import { fontSizes, fontWeights, radius, spacing } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type BatchFilterBarProps = {
  selectedBatchId: string | null;
  onChange: (batchId: string | null) => void;
};

export function BatchFilterBar({ selectedBatchId, onChange }: BatchFilterBarProps) {
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

  const handlePress = useCallback(
    (batchId: string | null) => {
      onChange(batchId);
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
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Pressable
          style={[styles.chip, selectedBatchId === null && styles.chipSelected]}
          onPress={() => handlePress(null)}
          testID="batch-filter-all"
        >
          <Text style={[styles.chipText, selectedBatchId === null && styles.chipTextSelected]}>
            All
          </Text>
        </Pressable>
        {batches.map((batch) => {
          const isSelected = selectedBatchId === batch.id;
          return (
            <Pressable
              key={batch.id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => handlePress(batch.id)}
              testID={`batch-filter-${batch.id}`}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {batch.batchName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
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
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
});
