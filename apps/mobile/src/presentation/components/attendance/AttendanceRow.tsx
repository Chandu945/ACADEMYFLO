import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Toggle } from '../ui/Toggle';
import { fontSizes, fontWeights, spacing, radius } from '../../theme';
import type { Colors } from '../../theme';
import type { DailyAttendanceItem } from '../../../domain/attendance/attendance.types';
import { useTheme } from '../../context/ThemeContext';

type AttendanceRowProps = {
  item: DailyAttendanceItem;
  onToggle: (studentId: string) => void;
  disabled: boolean;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0] ?? '';
    const last = parts[parts.length - 1] ?? '';
    return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function AttendanceRowComponent({ item, onToggle, disabled }: AttendanceRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isPresent = item.status === 'PRESENT';
  const isHoliday = item.status === 'HOLIDAY';

  const handleToggle = useCallback(() => {
    onToggle(item.studentId);
  }, [onToggle, item.studentId]);

  return (
    <View style={styles.card} testID={`attendance-row-${item.studentId}`}>
      <View style={[styles.avatar, isPresent ? styles.avatarPresent : styles.avatarAbsent]}>
        <Text style={[styles.avatarText, isPresent ? styles.avatarTextPresent : styles.avatarTextAbsent]}>
          {getInitials(item.fullName)}
        </Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.fullName}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isPresent ? styles.dotPresent : styles.dotAbsent]} />
          <Text style={[styles.statusLabel, isPresent ? styles.labelPresent : styles.labelAbsent]}>
            {isHoliday ? 'Holiday' : isPresent ? 'Present' : 'Absent'}
          </Text>
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarPresent: {
    backgroundColor: colors.successBg,
  },
  avatarAbsent: {
    backgroundColor: colors.dangerBg,
  },
  avatarText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  avatarTextPresent: {
    color: colors.success,
  },
  avatarTextAbsent: {
    color: colors.danger,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotPresent: {
    backgroundColor: colors.success,
  },
  dotAbsent: {
    backgroundColor: colors.danger,
  },
  statusLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
  labelPresent: {
    color: colors.success,
  },
  labelAbsent: {
    color: colors.danger,
  },
});
