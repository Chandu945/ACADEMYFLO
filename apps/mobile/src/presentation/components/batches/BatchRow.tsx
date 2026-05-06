import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppCard } from '../ui/AppCard';
import { AvatarImage } from '../ui/AvatarImage';
import { Badge } from '../ui/Badge';
import { InitialsAvatar } from '../ui/InitialsAvatar';
import { fontSizes, fontWeights, spacing, radius } from '../../theme';
import type { Colors } from '../../theme';
import type { BatchListItem } from '../../../domain/batch/batch.types';
import { useTheme } from '../../context/ThemeContext';

type BatchRowProps = {
  batch: BatchListItem;
  onPress: (batch: BatchListItem) => void;
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

function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h! >= 12 ? 'PM' : 'AM';
  const hour12 = h! % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function BatchRowComponent({ batch, onPress }: BatchRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handlePress = useCallback(() => onPress(batch), [onPress, batch]);

  const daysText = batch.days.length > 0
    ? batch.days.map((d) => DAY_SHORT[d] ?? d).join(', ')
    : 'No days set';

  const timeText = batch.startTime && batch.endTime
    ? `${formatTime12h(batch.startTime)} – ${formatTime12h(batch.endTime)}`
    : null;

  const studentCountText = batch.maxStudents != null
    ? `${batch.studentCount}/${batch.maxStudents}`
    : `${batch.studentCount}`;

  const capacityPct =
    batch.maxStudents && batch.maxStudents > 0
      ? Math.min(100, Math.round((batch.studentCount / batch.maxStudents) * 100))
      : null;

  const capacityColor =
    capacityPct == null
      ? colors.primary
      : capacityPct >= 90
        ? colors.danger
        : capacityPct >= 70
          ? colors.warning
          : colors.success;

  const isInactive = batch.status === 'INACTIVE';

  return (
    <AppCard
      style={isInactive ? styles.containerInactive : styles.container}
      onPress={handlePress}
      testID={`batch-row-${batch.id}`}
    >
      <View style={styles.row}>
        {batch.profilePhotoUrl ? (
          <AvatarImage url={batch.profilePhotoUrl} style={styles.avatar} />
        ) : (
          <InitialsAvatar
            name={batch.batchName}
            size={48}
            shape="rounded"
            variant="palette"
            style={styles.avatar}
          />
        )}

        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>
              {batch.batchName}
            </Text>
            {isInactive && (
              <Badge label="Inactive" variant="neutral" />
            )}
          </View>

          <Text style={styles.schedule} numberOfLines={1}>
            {timeText ? `${daysText}  ·  ${timeText}` : daysText}
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countNumber}>{studentCountText}</Text>
          <Text style={styles.countLabel}>students</Text>
          {capacityPct != null && (
            <View style={styles.capacityTrack}>
              <View
                style={[
                  styles.capacityFill,
                  { width: `${capacityPct}%`, backgroundColor: capacityColor },
                ]}
              />
            </View>
          )}
        </View>
      </View>
    </AppCard>
  );
}

export const BatchRow = memo(BatchRowComponent);

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    marginBottom: spacing.xs + 2,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  containerInactive: {
    marginBottom: spacing.xs + 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.borderStrong,
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 3,
  },
  name: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  schedule: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  countBadge: {
    alignItems: 'center',
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    minWidth: 56,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countNumber: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  countLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  capacityTrack: {
    marginTop: 6,
    height: 3,
    width: '100%',
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 2,
  },
});
