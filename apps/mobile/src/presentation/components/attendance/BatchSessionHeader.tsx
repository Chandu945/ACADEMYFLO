import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppIcon } from '../ui/AppIcon';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  batchName: string;
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
  startTime,
  endTime,
  onChange,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
        <Text style={styles.name} numberOfLines={1}>
          {batchName}
        </Text>
        {timeText && (
          <Text style={styles.time} numberOfLines={1}>
            {timeText}
          </Text>
        )}
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
        <AppIcon name="chevron-down" size={14} color={colors.textSecondary} />
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
      gap: 2,
    },
    name: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.bold,
      color: colors.text,
      letterSpacing: -0.1,
    },
    time: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: colors.textSecondary,
      // tabular-nums keeps "16:30" and "18:00" digits aligned at the same width.
      fontVariant: ['tabular-nums'],
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
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      letterSpacing: 0.2,
    },
  });
