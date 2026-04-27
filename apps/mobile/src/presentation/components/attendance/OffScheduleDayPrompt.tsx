import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import type { Weekday } from '../../../domain/batch/batch.types';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const FULL_DAY_NAMES: Record<Weekday, string> = {
  MON: 'Mondays',
  TUE: 'Tuesdays',
  WED: 'Wednesdays',
  THU: 'Thursdays',
  FRI: 'Fridays',
  SAT: 'Saturdays',
  SUN: 'Sundays',
};

const SHORT_DAY_NAMES: Record<Weekday, string> = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
  SUN: 'Sun',
};

type Props = {
  batchName: string;
  selectedWeekday: Weekday;
  scheduledDays: readonly Weekday[];
};

/**
 * Shown when staff land on a date that the selected batch doesn't meet on.
 * The roster is intentionally hidden so accidental marks can't happen.
 *
 * Intentionally no "jump to next session" button: jumping forward sends the
 * owner to a future date where attendance can't legitimately be marked. They
 * can use the date picker arrows in the header to navigate manually if they
 * want to backfill a past session.
 */
export function OffScheduleDayPrompt({
  batchName,
  selectedWeekday,
  scheduledDays,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const scheduledList = scheduledDays.length > 0
    ? scheduledDays.map((d) => SHORT_DAY_NAMES[d]).join(', ')
    : 'no days set';

  return (
    <View style={styles.container} testID="off-schedule-day-prompt">
      <View style={styles.iconWrap}>
        <AppIcon name="calendar-remove-outline" size={42} color={colors.warning} />
      </View>

      <Text style={styles.title}>
        {batchName} doesn't meet on {FULL_DAY_NAMES[selectedWeekday]}
      </Text>
      <Text style={styles.subtitle}>
        This batch is scheduled on{' '}
        <Text style={styles.subtitleStrong}>{scheduledList}</Text>. Pick one of those days
        to mark attendance.
      </Text>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing['2xl'],
    },
    iconWrap: {
      width: 84,
      height: 84,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.warningBg,
      marginBottom: spacing.lg,
      ...shadows.sm,
    },
    title: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
      letterSpacing: -0.2,
    },
    subtitle: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 320,
      marginBottom: spacing.xl,
    },
    subtitleStrong: {
      color: colors.text,
      fontWeight: fontWeights.bold,
    },
  });
