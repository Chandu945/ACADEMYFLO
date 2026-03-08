import React, { memo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { AppCard } from '../ui/AppCard';
import { colors, fontSizes, fontWeights, spacing, radius } from '../../theme';
import type { BatchListItem } from '../../../domain/batch/batch.types';

type BatchRowProps = {
  batch: BatchListItem;
  onPress: () => void;
};

const DAY_SHORT: Record<string, string> = {
  MON: 'M',
  TUE: 'T',
  WED: 'W',
  THU: 'Th',
  FRI: 'F',
  SAT: 'S',
  SUN: 'Su',
};

function BatchRowComponent({ batch, onPress }: BatchRowProps) {
  const daysText = batch.days.length > 0
    ? batch.days.map((d) => DAY_SHORT[d] ?? d).join(', ')
    : 'No days set';

  return (
    <AppCard style={styles.container} onPress={onPress} testID={`batch-row-${batch.id}`}>
      <View style={styles.row}>
        {batch.profilePhotoUrl ? (
          <Image source={{ uri: batch.profilePhotoUrl }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={styles.photoInitial}>{batch.batchName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {batch.batchName}
            </Text>
            {batch.status === 'INACTIVE' && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            )}
          </View>
          <Text style={styles.days} numberOfLines={1}>
            {daysText}
          </Text>
          <Text style={styles.studentCount}>
            {batch.studentCount} {batch.studentCount === 1 ? 'student' : 'students'}
          </Text>
        </View>
      </View>
    </AppCard>
  );
}

export const BatchRow = memo(BatchRowComponent);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photo: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    marginRight: spacing.md,
  },
  photoPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitial: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    flex: 1,
  },
  inactiveBadge: {
    backgroundColor: colors.textDisabled,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginLeft: spacing.sm,
  },
  inactiveBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.white,
  },
  days: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  studentCount: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    marginTop: 2,
  },
});
