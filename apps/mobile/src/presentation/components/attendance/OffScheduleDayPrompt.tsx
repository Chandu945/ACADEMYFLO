import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppIcon } from '../ui/AppIcon';
import type { Weekday } from '../../../domain/batch/batch.types';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
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
  /** Optional: jump to the nearest scheduled date (next or previous). */
  onJumpToNext?: () => void;
};

/**
 * Shown when staff land on a date that the selected batch doesn't meet on.
 * The roster is intentionally hidden so accidental marks can't happen.
 */
export function OffScheduleDayPrompt({
  batchName,
  selectedWeekday,
  scheduledDays,
  onJumpToNext,
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

      {onJumpToNext && (
        <TouchableOpacity
          style={styles.button}
          onPress={onJumpToNext}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Jump to the next scheduled day"
          testID="off-schedule-jump-button"
        >
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="calendar-arrow-right" size={16} color="#FFFFFF" />
          <Text style={styles.buttonText}>Jump to next session</Text>
        </TouchableOpacity>
      )}
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
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: 12,
      borderRadius: radius.full,
      overflow: 'hidden',
      minWidth: 220,
      ...shadows.sm,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.bold,
      letterSpacing: 0.3,
    },
  });
