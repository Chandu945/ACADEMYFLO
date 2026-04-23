import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppIcon } from '../ui/AppIcon';
import type { Weekday } from '../../../domain/batch/batch.types';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  batchName: string;
  days: readonly Weekday[];
  startTime?: string | null;
  endTime?: string | null;
  onChange: () => void;
};

/**
 * Persistent "you are here" banner shown above the student list whenever a
 * batch is selected for attendance. Makes the current session context obvious
 * so staff know exactly which roster they're marking.
 */
export function BatchSessionHeader({
  batchName,
  days,
  startTime,
  endTime,
  onChange,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const daysText = days.length > 0 ? days.join(' · ') : 'No days set';
  const timeText =
    startTime && endTime ? `${startTime} – ${endTime}` : startTime ? startTime : null;

  return (
    <View style={styles.wrap} testID="batch-session-header">
      <View style={styles.icon}>
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <AppIcon name="calendar-clock" size={20} color="#FFFFFF" />
      </View>

      <View style={styles.body}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Marking</Text>
          <View style={styles.dot} />
          <Text style={styles.daysInline}>{daysText}</Text>
        </View>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {batchName}
          </Text>
          {timeText && <Text style={styles.time}>{timeText}</Text>}
        </View>
      </View>

      <TouchableOpacity
        style={styles.changeBtn}
        onPress={onChange}
        accessibilityRole="button"
        accessibilityLabel="Change batch"
        testID="batch-session-header-change"
        activeOpacity={0.7}
      >
        <Text style={styles.changeText}>Change</Text>
        <AppIcon name="chevron-down" size={16} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.sm + 2,
      marginHorizontal: spacing.base,
      marginBottom: spacing.sm,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgSubtle,
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: radius.lg,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    label: {
      fontSize: 10,
      fontWeight: fontWeights.bold,
      color: colors.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    dot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.textDisabled,
    },
    daysInline: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.sm,
      minWidth: 0,
    },
    name: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.bold,
      color: colors.text,
      flexShrink: 1,
    },
    time: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: colors.textSecondary,
    },
    changeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    changeText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.bold,
      color: colors.text,
      letterSpacing: 0.3,
    },
  });
