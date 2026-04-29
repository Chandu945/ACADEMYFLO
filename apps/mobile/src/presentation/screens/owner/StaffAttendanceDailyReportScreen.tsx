import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, SafeAreaView, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { AppIcon } from '../../components/ui/AppIcon';
import { EmptyState } from '../../components/ui/EmptyState';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import type { StaffStackParamList } from '../../navigation/StaffStack';
import type { AppError } from '../../../domain/common/errors';
import type { DailyStaffReportResult } from '../../../domain/staff-attendance/staff-attendance.types';
import { getStaffDailyReportUseCase } from '../../../application/staff-attendance/use-cases/get-staff-daily-report.usecase';
import { getStaffDailyReport } from '../../../infra/staff-attendance/staff-attendance-api';
import { HolidayBanner } from '../../components/attendance/HolidayBanner';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Route = RouteProp<StaffStackParamList, 'StaffAttendanceDailyReport'>;

const reportApi = { getStaffDailyReport };

function formatReportDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0] ?? '';
    const last = parts[parts.length - 1] ?? '';
    return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function StaffAttendanceDailyReportScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute<Route>();
  const date = route.params?.date ?? '';

  const [report, setReport] = useState<DailyStaffReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getStaffDailyReportUseCase({ staffAttendanceApi: reportApi }, date);

      if (!mountedRef.current) return;

      if (result.ok) {
        setReport(result.value);
      } else {
        setError(result.error);
      }
    } catch (e) {
      if (__DEV__) console.error('[StaffAttendanceDailyReport] Load failed:', e);
      if (mountedRef.current) {
        setError({ code: 'UNKNOWN', message: 'Something went wrong.' });
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, [load]);

  const renderAbsentItem = useCallback(
    ({ item }: { item: { staffUserId: string; fullName: string } }) => (
      <View style={styles.absentRow} testID={`absent-staff-${item.staffUserId}`}>
        <InitialsAvatar
          name={item.fullName}
          size={40}
          style={styles.absentAvatar}
        />
        <Text style={styles.absentName} numberOfLines={1}>{item.fullName}</Text>
        <View style={styles.absentBadge}>
          <Text style={styles.absentBadgeText}>ABSENT</Text>
        </View>
      </View>
    ),
    [styles],
  );

  if (loading && !refreshing) {
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

  if (!report) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <EmptyState message="No report available" subtitle="No staff attendance data found for this date." />
        </View>
      </View>
    );
  }

  const totalCount = report.presentCount + report.absentCount;
  const percentage = totalCount > 0 ? Math.round((report.presentCount / totalCount) * 100) : 0;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      {/* Date header */}
      <Text style={styles.dateLabel}>{formatReportDate(report.date)}</Text>

      {report.isHoliday && <HolidayBanner isOwner={false} />}

      {/* Attendance Percentage Card */}
      <View style={styles.percentageCard}>
        <View style={styles.percentageCircle}>
          <Text style={styles.percentageText}>{percentage}%</Text>
        </View>
        <View style={styles.percentageInfo}>
          <Text style={styles.percentageTitle}>Overall Attendance</Text>
          <Text style={styles.percentageSubtitle}>
            {report.presentCount} of {totalCount} staff present
          </Text>
        </View>
      </View>

      {/* Count Cards */}
      <View style={styles.countsRow}>
        <View style={styles.countBox} accessibilityLabel={`${report.presentCount} staff present`}>
          <View style={[styles.countIconCircle, { backgroundColor: colors.successBg }]}>
            <AppIcon name="check-circle-outline" size={22} color={colors.success} />
          </View>
          <Text style={[styles.countNumber, { color: colors.success }]}>{report.presentCount}</Text>
          <Text style={styles.countLabel}>Present</Text>
        </View>
        <View style={styles.countBox} accessibilityLabel={`${report.absentCount} staff absent`}>
          <View style={[styles.countIconCircle, { backgroundColor: colors.bgSubtle }]}>
            <AppIcon name="close-circle-outline" size={22} color={colors.danger} />
          </View>
          <Text style={[styles.countNumber, { color: colors.danger }]}>{report.absentCount}</Text>
          <Text style={styles.countLabel}>Absent</Text>
        </View>
      </View>

      {/* Absent Staff List */}
      {report.absentStaff.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            
            <AppIcon name="account-alert-outline" size={18} color={colors.danger} />
            <Text style={styles.sectionTitle}>Absent Staff ({report.absentStaff.length})</Text>
          </View>
          <View testID="absent-staff-list">
            {report.absentStaff.map((item) => (
              <React.Fragment key={item.staffUserId}>
                {renderAbsentItem({ item })}
              </React.Fragment>
            ))}
          </View>
        </>
      )}

      {report.absentStaff.length === 0 && (
        <View style={styles.allPresentCard}>

          <AppIcon name="party-popper" size={32} color={colors.success} />
          <Text style={styles.allPresentTitle}>Everyone Present!</Text>
          <Text style={styles.allPresentSubtitle}>All staff members are present today</Text>
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
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
  dateLabel: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // ── Percentage Card ──
  percentageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  percentageCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.base,
  },
  percentageText: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  percentageInfo: {
    flex: 1,
  },
  percentageTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  percentageSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ── Count Cards ──
  countsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  countBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    alignItems: 'center',
    ...shadows.sm,
  },
  countIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  countNumber: {
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.bold,
  },
  countLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // ── Absent Staff Section ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  absentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  absentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  absentAvatarText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.danger,
  },
  absentName: {
    flex: 1,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  absentBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.dangerBg,
  },
  absentBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.danger,
    letterSpacing: 0.3,
  },

  // ── All Present Card ──
  allPresentCard: {
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.sm,
  },
  allPresentTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.success,
    marginTop: spacing.md,
  },
  allPresentSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.successText,
    marginTop: spacing.xs,
  },
});
