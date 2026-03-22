import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import type { AttendanceStackParamList } from '../../navigation/AttendanceStack';
import type { AppError } from '../../../domain/common/errors';
import type { StudentMonthlyDetail } from '../../../domain/attendance/attendance.types';
import { getStudentMonthlyDetailUseCase } from '../../../application/attendance/use-cases/get-student-monthly-detail.usecase';
import { getStudentMonthlyDetail } from '../../../infra/attendance/attendance-api';
import { AttendanceCalendar } from '../../components/attendance/AttendanceCalendar';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Route = RouteProp<AttendanceStackParamList, 'StudentMonthlyAttendance'>;

const detailApi = { getStudentMonthlyDetail };

export function StudentMonthlyAttendanceScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute<Route>();
  const studentId = route.params?.studentId ?? '';
  const fullName = route.params?.fullName ?? '';
  const month = route.params?.month ?? '';

  const [detail, setDetail] = useState<StudentMonthlyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getStudentMonthlyDetailUseCase(
        { attendanceApi: detailApi },
        studentId,
        month,
      );

      if (!mountedRef.current) return;

      if (result.ok) {
        setDetail(result.value);
      } else {
        setError(result.error);
      }
    } catch (e) {
      if (__DEV__) console.error('[StudentMonthlyAttendance] Load failed:', e);
      if (mountedRef.current) {
        setError({ code: 'UNKNOWN', message: 'Something went wrong.' });
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [studentId, month]);

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
          <EmptyState message="No attendance data available" subtitle="No data found for this student and month." />
        </View>
      </View>
    );
  }

  const dateItems = [
    ...detail.absentDates.map((d) => ({ date: d, type: 'ABSENT' as const })),
    ...detail.holidayDates.map((d) => ({ date: d, type: 'HOLIDAY' as const })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {fullName ? <Text style={styles.studentName} accessibilityRole="header">{fullName}</Text> : null}
      <Text style={styles.monthLabel}>{new Date(detail.month + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>

      <View style={styles.countsRow}>
        <View style={styles.countBox} accessibilityLabel={`${detail.presentCount} days present`}>
          <Text style={styles.presentNum}>{detail.presentCount}</Text>
          <Text style={styles.countLabel}>Present</Text>
        </View>
        <View style={styles.countBox} accessibilityLabel={`${detail.absentCount} days absent`}>
          <Text style={styles.absentNum}>{detail.absentCount}</Text>
          <Text style={styles.countLabel}>Absent</Text>
        </View>
        <View style={styles.countBox} accessibilityLabel={`${detail.holidayCount} holidays`}>
          <Text style={styles.holidayNum}>{detail.holidayCount}</Text>
          <Text style={styles.countLabel}>Holiday</Text>
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
            <View style={styles.dateRow} key={`${item.date}-${item.type}`} testID={`date-${item.date}`}>
              <Text style={styles.dateText}>{new Date(item.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              <Badge
                label={item.type}
                variant={item.type === 'ABSENT' ? 'danger' : 'warning'}
              />
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.base,
  },
  studentName: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  monthLabel: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  countsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  countBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  presentNum: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    color: colors.success,
  },
  absentNum: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    color: colors.danger,
  },
  holidayNum: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    color: colors.warning,
  },
  countLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
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
