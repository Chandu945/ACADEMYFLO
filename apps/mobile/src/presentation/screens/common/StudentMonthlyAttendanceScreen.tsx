import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import type { AttendanceStackParamList } from '../../navigation/AttendanceStack';
import type { AppError } from '../../../domain/common/errors';
import type { StudentMonthlyDetail } from '../../../domain/attendance/attendance.types';
import { getStudentMonthlyDetailUseCase } from '../../../application/attendance/use-cases/get-student-monthly-detail.usecase';
import { getStudentMonthlyDetail } from '../../../infra/attendance/attendance-api';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { Badge } from '../../components/ui/Badge';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

type Route = RouteProp<AttendanceStackParamList, 'StudentMonthlyAttendance'>;

const detailApi = { getStudentMonthlyDetail };

export function StudentMonthlyAttendanceScreen() {
  const route = useRoute<Route>();
  const { studentId, month } = route.params;

  const [detail, setDetail] = useState<StudentMonthlyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

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
    setLoading(false);
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

  if (!detail) return null;

  const dateItems = [
    ...detail.absentDates.map((d) => ({ date: d, type: 'ABSENT' as const })),
    ...detail.holidayDates.map((d) => ({ date: d, type: 'HOLIDAY' as const })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.monthLabel}>{detail.month}</Text>

        <View style={styles.countsRow}>
          <View style={styles.countBox}>
            <Text style={styles.presentNum}>{detail.presentCount}</Text>
            <Text style={styles.countLabel}>Present</Text>
          </View>
          <View style={styles.countBox}>
            <Text style={styles.absentNum}>{detail.absentCount}</Text>
            <Text style={styles.countLabel}>Absent</Text>
          </View>
          <View style={styles.countBox}>
            <Text style={styles.holidayNum}>{detail.holidayCount}</Text>
            <Text style={styles.countLabel}>Holiday</Text>
          </View>
        </View>

        {dateItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Absences & Holidays</Text>
            <FlatList
              data={dateItems}
              renderItem={({ item }) => (
                <View style={styles.dateRow} testID={`date-${item.date}`}>
                  <Text style={styles.dateText}>{item.date}</Text>
                  <Badge
                    label={item.type}
                    variant={item.type === 'ABSENT' ? 'danger' : 'warning'}
                  />
                </View>
              )}
              keyExtractor={(item) => `${item.date}-${item.type}`}
              scrollEnabled={false}
              testID="dates-list"
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.base,
  },
  monthLabel: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    color: colors.text,
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: spacing.sm,
  },
  dateText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
});
