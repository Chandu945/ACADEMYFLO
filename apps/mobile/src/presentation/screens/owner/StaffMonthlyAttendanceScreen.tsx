import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import type { StaffStackParamList } from '../../navigation/StaffStack';
import type { AppError } from '../../../domain/common/errors';
import type { StaffMonthlyDetail } from '../../../domain/staff-attendance/staff-attendance.types';
import { getStaffMonthlyDetailUseCase } from '../../../application/staff-attendance/use-cases/get-staff-monthly-detail.usecase';
import { getStaffMonthlyDetail } from '../../../infra/staff-attendance/staff-attendance-api';
import { AttendanceCalendar } from '../../components/attendance/AttendanceCalendar';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Route = RouteProp<StaffStackParamList, 'StaffMonthlyAttendance'>;

const detailApi = { getStaffMonthlyDetail };

export function StaffMonthlyAttendanceScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute<Route>();
  const staffUserId = route.params?.staffUserId ?? '';
  const fullName = route.params?.fullName ?? '';
  const month = route.params?.month ?? '';

  const [detail, setDetail] = useState<StaffMonthlyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getStaffMonthlyDetailUseCase(
        { staffAttendanceApi: detailApi },
        staffUserId,
        month,
      );
      if (!mountedRef.current) return;
      if (result.ok) {
        setDetail(result.value);
      } else {
        setError(result.error);
      }
    } catch (e) {
      if (__DEV__) console.error('[StaffMonthlyAttendance] Load failed:', e);
      if (mountedRef.current) {
        setError({ code: 'UNKNOWN', message: 'Something went wrong.' });
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [staffUserId, month]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <SkeletonTile />
          <SkeletonTile />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <InlineError message={error.message} onRetry={load} />
        </View>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <EmptyState message="No attendance data" subtitle="No data found for this staff and month." />
        </View>
      </View>
    );
  }

  const pct =
    detail.expectedDays > 0
      ? Math.round((detail.presentDays / detail.expectedDays) * 100)
      : null;
  const tone =
    pct == null ? 'neutral' : pct >= 90 ? 'success' : pct >= 75 ? 'warning' : 'danger';

  const dateItems = [
    ...detail.absentDates.map((d) => ({ date: d, type: 'ABSENT' as const })),
    ...detail.holidayDates.map((d) => ({ date: d, type: 'HOLIDAY' as const })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.staffName} accessibilityRole="header">
          {fullName || detail.fullName}
        </Text>
        <Text style={styles.monthLabel}>
          {new Date(detail.month + '-01T00:00:00').toLocaleDateString('en-IN', {
            month: 'long',
            year: 'numeric',
          })}
        </Text>

        {/* Headline card: prominent percentage + day-level summary */}
        <View style={[styles.headlineCard, styles[`headlineCard_${tone}`]]}>
          <View style={styles.headlineLeft}>
            <Text style={[styles.headlinePct, styles[`headlinePctText_${tone}`]]}>
              {pct == null ? '—' : `${pct}%`}
            </Text>
            <Text style={styles.headlineLabel}>
              {detail.expectedDays > 0
                ? `${detail.presentDays} of ${detail.expectedDays} days`
                : 'No days yet'}
            </Text>
          </View>
          <View style={styles.headlineDivider} />
          <View style={styles.headlineRight}>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatNum, { color: colors.success }]}>
                {detail.presentDays}
              </Text>
              <Text style={styles.miniStatLabel}>Present</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatNum, { color: colors.danger }]}>
                {detail.absentDays}
              </Text>
              <Text style={styles.miniStatLabel}>Absent</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatNum, { color: colors.warning }]}>
                {detail.holidayCount}
              </Text>
              <Text style={styles.miniStatLabel}>Holiday</Text>
            </View>
          </View>
        </View>

        <AttendanceCalendar
          month={detail.month}
          absentDates={detail.absentDates}
          holidayDates={detail.holidayDates}
        />

        {dateItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Absences & Holidays</Text>
            {dateItems.map((item) => (
              <View
                style={styles.dateRow}
                key={`${item.date}-${item.type}`}
                testID={`date-${item.date}`}
              >
                <Text style={styles.dateText}>
                  {new Date(item.date + 'T00:00:00').toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
                <Badge
                  label={item.type}
                  variant={item.type === 'ABSENT' ? 'danger' : 'warning'}
                />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      padding: spacing.base,
    },
    staffName: {
      fontSize: fontSizes['2xl'],
      fontWeight: fontWeights.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.xs,
      letterSpacing: -0.3,
    },
    monthLabel: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.base,
    },
    headlineCard: {
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.base,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      gap: spacing.md,
      ...shadows.sm,
    },
    headlineCard_success: { borderLeftColor: colors.success },
    headlineCard_warning: { borderLeftColor: colors.warning },
    headlineCard_danger: { borderLeftColor: colors.danger },
    headlineCard_neutral: { borderLeftColor: colors.border },
    headlineLeft: {
      justifyContent: 'center',
      minWidth: 90,
    },
    headlinePct: {
      fontSize: fontSizes['3xl'],
      fontWeight: fontWeights.bold,
      letterSpacing: -1,
    },
    headlinePctText_success: { color: colors.successText },
    headlinePctText_warning: { color: colors.warningText },
    headlinePctText_danger: { color: colors.dangerText },
    headlinePctText_neutral: { color: colors.textSecondary },
    headlineLabel: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      marginTop: 2,
      fontWeight: fontWeights.medium,
    },
    headlineDivider: {
      width: 1,
      backgroundColor: colors.border,
    },
    headlineRight: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    miniStat: {
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    miniStatNum: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      letterSpacing: -0.3,
    },
    miniStatLabel: {
      fontSize: 10,
      color: colors.textDisabled,
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.base,
      marginBottom: spacing.sm,
      ...shadows.sm,
    },
    dateText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: colors.text,
    },
  });
