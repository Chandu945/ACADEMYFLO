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
  const isAbsent = !isPresent && !isHoliday;

  const handleToggle = useCallback(() => {
    onToggle(item.studentId);
  }, [onToggle, item.studentId]);

  return (
    <View
      style={[
        styles.card,
        isAbsent && styles.cardAbsent,
        isHoliday && styles.cardHoliday,
      ]}
      testID={`attendance-row-${item.studentId}`}
    >
      <InitialsAvatar
        name={item.fullName}
        size={40}
        variant="palette"
        style={styles.avatar}
      />

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.fullName}</Text>
        {isAbsent && (
          <View style={styles.statusRow}>
            <Badge label="Absent" variant="danger" dot />
          </View>
        )}
        {isHoliday && (
          <View style={styles.statusRow}>
            <Badge label="Holiday" variant="warning" dot />
          </View>
        )}
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
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
    gap: spacing.md,
  },
  cardAbsent: {
    borderLeftColor: colors.danger,
  },
  cardHoliday: {
    borderLeftColor: colors.warning,
  },
  avatar: {
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
});
