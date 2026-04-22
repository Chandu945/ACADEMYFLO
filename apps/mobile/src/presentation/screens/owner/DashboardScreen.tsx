import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { AppIcon } from '../../components/ui/AppIcon';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { OwnerTabParamList } from '../../navigation/OwnerTabs';
import { useOwnerDashboard } from '../../../application/dashboard/use-owner-dashboard';
import { getOwnerDashboard } from '../../../infra/dashboard/dashboard-api';
import { useFAB } from '../../context/FABContext';
import { FinancialOverviewWidget } from '../../components/dashboard/FinancialOverviewWidget';
import { AttendanceSummaryWidget } from '../../components/dashboard/AttendanceSummaryWidget';
import { AttendanceMarkingCards } from '../../components/dashboard/AttendanceMarkingCards';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { SubscriptionBanner } from '../../components/dashboard/SubscriptionBanner';
import { PendingDeletionBanner } from '../../components/dashboard/PendingDeletionBanner';
import { BirthdayWidget } from '../../components/dashboard/BirthdayWidget';
import { MonthlyChartWidget } from '../../components/dashboard/MonthlyChartWidget';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const DEFAULT_RANGE = { mode: 'preset' as const, preset: 'THIS_MONTH' as const };
const dashboardApi = { getOwnerDashboard };

type DashboardNav = BottomTabNavigationProp<OwnerTabParamList, 'Dashboard'>;

export function DashboardScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<DashboardNav>();
  const { data, loading, error, refetch } = useOwnerDashboard(DEFAULT_RANGE, dashboardApi);
  const { showFAB, hideFAB } = useFAB();

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      showFAB();
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
      } else {
        refetch();
      }
      return () => hideFAB();
    }, [showFAB, hideFAB, refetch]),
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // Error handled by the hook
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const isEmpty = data && data.totalActiveStudents === 0 && data.newAdmissions === 0 && data.inactiveStudents === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
        testID="dashboard-scroll"
      >
        <SubscriptionBanner />
        <PendingDeletionBanner />
        {error && (
          <InlineError
            message={data ? 'Could not refresh data. Showing last known values.' : error.message}
            onRetry={refetch}
          />
        )}

        {loading && !refreshing ? (
          <View testID="skeleton-container">
            <SkeletonTile />
            <View style={styles.row}>
              <SkeletonTile />
              <SkeletonTile />
            </View>
            <SkeletonTile />
            <View style={styles.row}>
              <SkeletonTile />
              <SkeletonTile />
            </View>
          </View>
        ) : data ? (
          <View testID="kpi-container">
            {/* ── Empty State for New Academies ──────────── */}
            {isEmpty && (
              <TouchableOpacity
                style={styles.onboardingCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Students')}
                accessibilityLabel="Get started by adding your first student"
                accessibilityRole="button"
              >
                <View style={styles.cardHeaderIcon}>
                  <LinearGradient
                    colors={[gradient.start, gradient.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <AppIcon name="rocket-launch-outline" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.onboardingText}>
                  <Text style={styles.onboardingTitle}>Get Started</Text>
                  <Text style={styles.onboardingSubtitle}>Add your first student to begin managing your academy</Text>
                </View>
                <AppIcon name="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {/* ── Students Overview ─────────────────────────── */}
            <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => navigation.navigate('Students')} accessibilityLabel="Students overview. Tap to view students" accessibilityRole="button">
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <LinearGradient
                    colors={[gradient.start, gradient.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <AppIcon name="school-outline" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.cardTitle}>Students Overview</Text>
                <AppIcon name="chevron-right" size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.overviewGrid}>
                <View style={styles.overviewItem} accessibilityLabel={`${data.totalActiveStudents.toLocaleString()} active students`}>
                  <Text style={styles.overviewValue}>{data.totalActiveStudents.toLocaleString()}</Text>
                  <Text style={styles.overviewLabel}>Active</Text>
                </View>
                <View style={styles.overviewDivider} />
                <View style={styles.overviewItem} accessibilityLabel={`${data.newAdmissions.toLocaleString()} new admissions`}>
                  <Text style={styles.overviewValue}>{data.newAdmissions.toLocaleString()}</Text>
                  <Text style={styles.overviewLabel}>New</Text>
                </View>
                <View style={styles.overviewDivider} />
                <View style={styles.overviewItem} accessibilityLabel={`${data.inactiveStudents.toLocaleString()} inactive students`}>
                  <Text style={styles.overviewValue}>{data.inactiveStudents.toLocaleString()}</Text>
                  <Text style={styles.overviewLabel}>Inactive</Text>
                </View>
                <View style={styles.overviewDivider} />
                <View style={styles.overviewItem} accessibilityLabel={`${data.dueStudentsCount.toLocaleString()} students with dues`}>
                  <Text style={styles.overviewValue}>{data.dueStudentsCount.toLocaleString()}</Text>
                  <Text style={styles.overviewLabel}>Due</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* ── Pending Requests ──────────────────────────── */}
            {data.pendingPaymentRequests > 0 && (
              <TouchableOpacity style={styles.pendingBanner} activeOpacity={0.7} onPress={() => navigation.navigate('Fees')} accessibilityLabel={`${data.pendingPaymentRequests} pending payment requests. Tap to review`} accessibilityRole="button">
                <View style={styles.pendingLeft}>
                  <View style={styles.cardHeaderIcon}>
                    <LinearGradient
                      colors={[gradient.start, gradient.end]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <AppIcon name="file-document-outline" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.pendingText}>Pending Requests</Text>
                </View>
                <View style={styles.pendingRight}>
                  <View style={styles.pendingBadge}>
                    <LinearGradient
                      colors={[gradient.start, gradient.end]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.pendingBadgeText}>{data.pendingPaymentRequests}</Text>
                  </View>
                  <AppIcon name="chevron-right" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            )}

            <FinancialOverviewWidget
              onCollectedPress={() => navigation.navigate('Fees')}
              onPendingPress={() => navigation.navigate('Fees')}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- nested stack navigation requires composite types (TODO)
              onExpensesPress={() => navigation.navigate('More', { screen: 'ExpensesHome' } as any)}
              initialData={data ? {
                collected: data.collectedAmount,
                pending: data.totalPendingAmount,
                expenses: data.totalExpenses,
                lateFees: data.lateFeeCollected,
              } : null}
            />
            {data?.isHolidayToday ? (
              <TouchableOpacity
                style={styles.holidayCard}
                onPress={() => navigation.navigate('Attendance')}
                activeOpacity={0.7}
              >
                <View style={styles.holidayIconCircle}>
                  <AppIcon name="party-popper" size={22} color={colors.warningAccent} />
                </View>
                <View style={styles.holidayTextWrap}>
                  <Text style={styles.holidayTitle}>Holiday Today</Text>
                  <Text style={styles.holidaySubtitle}>No attendance tracking for today</Text>
                </View>
                <AppIcon name="chevron-right" size={18} color={colors.textDisabled} />
              </TouchableOpacity>
            ) : (
              <>
                <AttendanceMarkingCards
                  onStudentPress={() => navigation.navigate('Attendance')}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- nested stack navigation
                  onStaffPress={() => navigation.navigate('More', { screen: 'StaffAttendance' } as any)}
                  initialStudentData={data ? {
                    present: data.todayPresentCount,
                    total: data.todayPresentCount + data.todayAbsentCount,
                  } : null}
                />
                <AttendanceSummaryWidget
                  onPress={() => navigation.navigate('Attendance')}
                />
              </>
            )}
            <MonthlyChartWidget
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- nested stack navigation
              onPress={() => navigation.navigate('More', { screen: 'ReportsHome' } as any)}
            />
            <BirthdayWidget />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },

  /* ── Onboarding ────────────────────────────────── */
  onboardingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  onboardingText: {
    flex: 1,
  },
  onboardingTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  onboardingSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },

  /* ── Cards ───────────────────────────────────────── */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },

  /* ── Students Overview Grid ──────────────────────── */
  overviewGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  overviewDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  overviewValue: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  overviewLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* ── Pending Banner ──────────────────────────────── */
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pendingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pendingText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  pendingBadge: {
    overflow: 'hidden',
    borderRadius: radius.full,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  pendingBadgeText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },

  /* ── Holiday Card ──────────────────────────────── */
  holidayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  holidayIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.warningLightBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holidayTextWrap: {
    flex: 1,
  },
  holidayTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  holidaySubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
