import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppIcon } from '../ui/AppIcon';
import type { BatchListItem } from '../../../domain/batch/batch.types';
import { getBatchesCached } from '../../../infra/batch/batch-cache';
import { fontSizes, fontWeights, radius, spacing, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type BatchFilterBarProps = {
  selectedBatchId: string | null;
  onChange: (batchId: string | null, batchName?: string) => void;
};

export function BatchFilterBar({ selectedBatchId, onChange }: BatchFilterBarProps) {
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

  const handlePress = useCallback(
    (batchId: string | null, name?: string) => {
      onChange(batchId, name);
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

  const allSelected = selectedBatchId === null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        accessibilityRole="radiogroup"
        accessibilityLabel="Batch filter"
      >
        <Pressable
          style={[styles.chip, allSelected && styles.chipSelected]}
          onPress={() => handlePress(null)}
          accessibilityRole="radio"
          accessibilityState={{ selected: allSelected }}
          accessibilityLabel={allSelected ? 'All batches, selected' : 'All batches'}
          testID="batch-filter-all"
        >
          {allSelected && (
            <LinearGradient
              colors={[gradient.start, gradient.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          {allSelected && <AppIcon name="check" size={14} color="#FFFFFF" />}
          <Text style={[styles.chipText, allSelected && styles.chipTextSelected]}>
            All Batches
          </Text>
        </Pressable>
        {batches.map((batch) => {
          const isSelected = selectedBatchId === batch.id;
          return (
            <Pressable
              key={batch.id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => handlePress(batch.id, batch.batchName)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={isSelected ? `${batch.batchName}, selected` : batch.batchName}
              testID={`batch-filter-${batch.id}`}
            >
              {isSelected && (
                <LinearGradient
                  colors={[gradient.start, gradient.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <View style={[styles.batchInitial, isSelected && styles.batchInitialSelected]}>
                <Text style={[styles.batchInitialText, isSelected && styles.batchInitialTextSelected]}>
                  {batch.batchName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {batch.batchName}
              </Text>
              {isSelected && <AppIcon name="check" size={14} color="#FFFFFF" />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    gap: 6,
    overflow: 'hidden',
  },
  chipSelected: {
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textMedium,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: fontWeights.semibold,
  },
  batchInitial: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchInitialSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  batchInitialText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  batchInitialTextSelected: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
});
