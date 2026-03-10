import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
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
          testID="daily-report-button"
        >
          <View style={styles.actionIconWrap}>
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="file-chart-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.actionLabel}>Daily Report</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={onMonthlySummary}
          activeOpacity={0.7}
          testID="monthly-summary-button"
        >
          <View style={styles.actionIconWrap}>
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="calendar-text-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.actionLabel}>Monthly Summary</Text>
        </TouchableOpacity>

        {isOwner && !isHoliday && onDeclareHoliday && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={onDeclareHoliday}
            activeOpacity={0.7}
            disabled={declaringHoliday}
            testID="declare-holiday-button"
          >
            {declaringHoliday ? (
              <ActivityIndicator size="small" color={colors.warning} />
            ) : (
              <>
                <View style={[styles.actionIconWrap, styles.holidayIconWrap]}>
                  {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                  <Icon name="calendar-star" size={18} color={colors.warning} />
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
    backgroundColor: colors.primarySoft,
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
