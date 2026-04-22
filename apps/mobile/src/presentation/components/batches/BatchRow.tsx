import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { AppCard } from '../ui/AppCard';
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

  return (
    <AppCard style={styles.container} onPress={handlePress} testID={`batch-row-${batch.id}`}>
      <View style={styles.row}>
        {batch.profilePhotoUrl ? (
          <Image source={{ uri: batch.profilePhotoUrl }} style={styles.avatar} />
        ) : (
          <InitialsAvatar
            name={batch.batchName}
            size={48}
            shape="rounded"
            style={styles.avatar}
          />
        )}

        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>
              {batch.batchName}
            </Text>
            {batch.status === 'INACTIVE' && (
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
        </View>
      </View>
    </AppCard>
  );
}

export const BatchRow = memo(BatchRowComponent);

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  info: {
    flex: 1,
    marginRight: spacing.sm,
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
    minWidth: 48,
  },
  countNumber: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  countLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
