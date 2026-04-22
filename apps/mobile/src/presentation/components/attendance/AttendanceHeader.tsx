import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type AttendanceHeaderProps = {
  isOwner: boolean;
  isHoliday: boolean;
  onDeclareHoliday?: () => void;
  onDailyReport: () => void;
  onMonthlySummary: () => void;
  declaringHoliday?: boolean;
};

export function AttendanceHeader({
  isOwner,
  isHoliday,
  onDeclareHoliday,
  onDailyReport,
  onMonthlySummary,
  declaringHoliday,
}: AttendanceHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={onDailyReport}
          activeOpacity={0.7}
          accessibilityLabel="View daily report"
          accessibilityRole="button"
          testID="daily-report-button"
        >
          <View style={styles.actionIconWrap}>
            <LinearGradient
              colors={[gradient.start, gradient.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <AppIcon name="file-chart-outline" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.actionLabel}>Daily Report</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={onMonthlySummary}
          activeOpacity={0.7}
          accessibilityLabel="View monthly summary"
          accessibilityRole="button"
          testID="monthly-summary-button"
        >
          <View style={styles.actionIconWrap}>
            <LinearGradient
              colors={[gradient.start, gradient.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <AppIcon name="calendar-text-outline" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.actionLabel}>Monthly Summary</Text>
        </TouchableOpacity>

        {isOwner && !isHoliday && onDeclareHoliday && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={onDeclareHoliday}
            activeOpacity={0.7}
            disabled={declaringHoliday}
            accessibilityLabel="Declare holiday for this date"
            accessibilityRole="button"
            testID="declare-holiday-button"
          >
            {declaringHoliday ? (
              <ActivityIndicator size="small" color={colors.warning} />
            ) : (
              <>
                <View style={[styles.actionIconWrap, styles.holidayIconWrap]}>
                  
                  <AppIcon name="calendar-star" size={18} color={colors.warning} />
                </View>
                <Text style={styles.actionLabel}>Holiday</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
    minHeight: 64,
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holidayIconWrap: {
    backgroundColor: colors.warningBg,
  },
  actionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textMedium,
    textAlign: 'center',
  },
});
