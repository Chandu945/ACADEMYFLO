import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Toggle } from '../ui/Toggle';
import { InitialsAvatar } from '../ui/InitialsAvatar';
import { Badge } from '../ui/Badge';
import { fontSizes, fontWeights, spacing, radius } from '../../theme';
import type { Colors } from '../../theme';
import type { DailyAttendanceItem } from '../../../domain/attendance/attendance.types';
import { useTheme } from '../../context/ThemeContext';

type AttendanceRowProps = {
  item: DailyAttendanceItem;
  onToggle: (studentId: string) => void;
  disabled: boolean;
};

function AttendanceRowComponent({ item, onToggle, disabled }: AttendanceRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isPresent = item.status === 'PRESENT';
  const isHoliday = item.status === 'HOLIDAY';

  const handleToggle = useCallback(() => {
    onToggle(item.studentId);
  }, [onToggle, item.studentId]);

  const badge = isHoliday
    ? { label: 'Holiday', variant: 'warning' as const }
    : isPresent
      ? { label: 'Present', variant: 'success' as const }
      : { label: 'Absent', variant: 'danger' as const };

  return (
    <View style={styles.card} testID={`attendance-row-${item.studentId}`}>
      <InitialsAvatar
        name={item.fullName}
        size={40}
        style={{ marginRight: spacing.md }}
      />

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.fullName}</Text>
        <View style={styles.statusRow}>
          <Badge label={badge.label} variant={badge.variant} dot />
        </View>
      </View>

      <Toggle
        value={isPresent}
        onValueChange={handleToggle}
        disabled={disabled}
        accessibilityLabel={`${item.fullName} attendance toggle`}
        testID={`toggle-${item.studentId}`}
      />
    </View>
  );
}

export const AttendanceRow = memo(AttendanceRowComponent);

const makeStyles = (colors: Colors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
