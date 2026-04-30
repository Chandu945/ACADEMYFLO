import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/ui/AppIcon';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StaffTabParamList } from '../../navigation/StaffTabs';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import type { DailyReportResult } from '../../../domain/attendance/attendance.types';
import type { EventSummary } from '../../../domain/event/event.types';
import type { EnquirySummary } from '../../../domain/enquiry/enquiry.types';
import type { PaymentRequestItem } from '../../../domain/fees/payment-requests.types';
import type { BirthdayStudent } from '../../../domain/dashboard/dashboard.types';
import { getDailyReport } from '../../../infra/attendance/attendance-api';
import { listPaymentRequests } from '../../../infra/fees/payment-requests-api';
import { getEventSummary } from '../../../infra/event/event-api';
import { getEnquirySummary } from '../../../infra/enquiry/enquiry-api';
import { getBirthdays } from '../../../infra/dashboard/dashboard-api';
import { useFAB } from '../../context/FABContext';
import { useFocusEffect } from '@react-navigation/native';
import { BirthdayWidget } from '../../components/dashboard/BirthdayWidget';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { getTodayIST } from '../../../domain/common/date-utils';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<StaffTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<MoreStackParamList>
>;

type DashboardData = {
  attendance: DailyReportResult | null;
  pendingRequests: PaymentRequestItem[];
  eventSummary: EventSummary | null;
  enquirySummary: EnquirySummary | null;
  birthdayStudents: BirthdayStudent[];
};

function formatCurrency(n: number): string {
  return `\u20B9${n.toLocaleString('en-IN')}`;
}

export function StaffDashboardScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const { showFAB, hideFAB } = useFAB();

  const [data, setData] = useState<DashboardData>({
    attendance: null,
    pendingRequests: [],
    eventSummary: null,
    enquirySummary: null,
    birthdayStudents: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    const today = getTodayIST();
    setError(null);

    try {
      const [attendanceRes, requestsRes, eventsRes, enquiryRes, birthdayRes] = await Promise.all([
        getDailyReport(today),
        listPaymentRequests('PENDING'),
        getEventSummary(),
        getEnquirySummary(),
        getBirthdays('month'),
      ]);

      if (!mountedRef.current) return;

      const results = [attendanceRes, requestsRes, eventsRes, enquiryRes, birthdayRes];
      const allFailed = results.every((r) => !r.ok);
      if (allFailed) {
        // All five calls failed — pick the most actionable error code from
        // the first failure to give the user something specific instead of
        // a generic "try again" message.
        const first = results.find((r) => !r.ok);
        const code = first && !first.ok ? first.error.code : 'UNKNOWN';
        const msg =
          code === 'NETWORK' || code === 'UNKNOWN'
            ? 'Could not reach the server. Check your connection and try again.'
            : code === 'FORBIDDEN'
              ? 'You do not have permission to view this dashboard.'
              : code === 'UNAUTHORIZED'
                ? 'Your session has expired. Please sign in again.'
                : 'Failed to load dashboard data. Please try again.';
        setError(msg);
      }

      setData({
        attendance: attendanceRes.ok ? attendanceRes.value : null,
        pendingRequests: requestsRes.ok ? requestsRes.value.data : [],
        eventSummary: eventsRes.ok ? eventsRes.value : null,
        enquirySummary: enquiryRes.ok ? enquiryRes.value : null,
        birthdayStudents: birthdayRes.ok ? birthdayRes.value.students : [],
      });
    } catch {
      if (!mountedRef.current) return;
      setError('Could not reach the server. Check your connection and try again.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      showFAB();
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
      } else {
        load();
      }
      return () => hideFAB();
    }, [showFAB, hideFAB, load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const { attendance, pendingRequests, eventSummary, enquirySummary, birthdayStudents } = data;

  const totalStudents = attendance ? attendance.presentCount + attendance.absentCount : 0;
  const attendancePct = totalStudents > 0
    ? Math.round((attendance!.presentCount / totalStudents) * 100)
    : 0;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
      }
      showsVerticalScrollIndicator={false}
      testID="staff-dashboard-scroll"
    >
      {error && <InlineError message={error} onRetry={load} />}
      {loading && !refreshing ? (
        <View testID="staff-skeleton">
          <View style={styles.gridRow}>
            <SkeletonTile />
            <SkeletonTile />
          </View>
          <View style={styles.gridRow}>
            <SkeletonTile />
            <SkeletonTile />
          </View>
        </View>
      ) : (
        <View testID="staff-dashboard-content">
          {/* ── Quick Stats Grid ── */}
          <View style={styles.gridRow}>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('Attendance' as never)}
              activeOpacity={0.7}
              testID="stat-attendance"
            >
              <View style={[styles.statIcon, { backgroundColor: colors.successBg }]}>
                
                <AppIcon name="calendar-check-outline" size={22} color={colors.success} />
              </View>
              <Text style={styles.statValue}>
                {attendance ? (attendance.isHoliday ? '🏖' : attendance.presentCount) : '–'}
              </Text>
              <Text style={styles.statLabel}>
                {attendance?.isHoliday ? 'Holiday Today' : 'Present Today'}
              </Text>
              {attendance && !attendance.isHoliday && attendance.absentCount > 0 && (
                <View style={styles.statSub}>
                  <Text style={styles.statSubText}>
                    {attendance.absentCount} absent
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('Fees' as never)}
              activeOpacity={0.7}
              testID="stat-pending-requests"
            >
              <View style={[styles.statIcon, { overflow: 'hidden' }]}>
                <LinearGradient
                  colors={[gradient.start, gradient.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <AppIcon name="file-document-outline" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.statValue}>
                {pendingRequests.length}
              </Text>
              <Text style={styles.statLabel}>Pending Requests</Text>
              {pendingRequests.length > 0 && (
                <View style={[styles.statSub, { backgroundColor: colors.bgSubtle }]}>
                  <Text style={[styles.statSubText, { color: colors.text }]}>
                    Awaiting approval
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.gridRow}>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('More', { screen: 'EventList' } as never)}
              activeOpacity={0.7}
              testID="stat-events"
            >
              <View style={[styles.statIcon, { backgroundColor: colors.infoBg }]}>
                
                <AppIcon name="calendar-star" size={22} color={colors.info} />
              </View>
              <Text style={styles.statValue}>
                {eventSummary ? eventSummary.thisMonth.upcoming : '–'}
              </Text>
              <Text style={styles.statLabel}>Upcoming Events</Text>
              {eventSummary && eventSummary.thisMonth.total > 0 && (
                <View style={[styles.statSub, { backgroundColor: colors.infoBg }]}>
                  <Text style={[styles.statSubText, { color: colors.info }]}>
                    {eventSummary.thisMonth.total} this month
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('More', { screen: 'EnquiryList' } as never)}
              activeOpacity={0.7}
              testID="stat-enquiries"
            >
              <View style={[styles.statIcon, { backgroundColor: colors.warningBg }]}>
                
                <AppIcon name="account-question-outline" size={22} color={colors.warning} />
              </View>
              <Text style={styles.statValue}>
                {enquirySummary ? enquirySummary.todayFollowUp : '–'}
              </Text>
              <Text style={styles.statLabel}>Follow-ups Today</Text>
              {enquirySummary && enquirySummary.active > 0 && (
                <View style={[styles.statSub, { backgroundColor: colors.warningBg }]}>
                  <Text style={[styles.statSubText, { color: colors.warning }]}>
                    {enquirySummary.active} active
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Quick Actions ── */}
          <View style={styles.quickActionsCard}>
            <Text style={styles.sectionLabel}>Quick Actions</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => navigation.navigate('Attendance' as never)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.successBg }]}>
                  
                  <AppIcon name="calendar-check-outline" size={20} color={colors.success} />
                </View>
                <Text style={styles.quickActionLabel}>Mark{'\n'}Attendance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => navigation.navigate('Students' as never)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { overflow: 'hidden' }]}>
                  <LinearGradient
                    colors={[gradient.start, gradient.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <AppIcon name="account-plus-outline" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.quickActionLabel}>Add{'\n'}Student</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => navigation.navigate('Fees' as never)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.infoBg }]}>
                  
                  <AppIcon name="cash-plus" size={20} color={colors.info} />
                </View>
                <Text style={styles.quickActionLabel}>Fee{'\n'}Request</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => navigation.navigate('More', { screen: 'AddEnquiry' } as never)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.warningBg }]}>
                  
                  <AppIcon name="account-question-outline" size={20} color={colors.warning} />
                </View>
                <Text style={styles.quickActionLabel}>New{'\n'}Enquiry</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Today's Attendance Overview ── */}
          {attendance && (
            <TouchableOpacity
              style={styles.attendanceCard}
              onPress={() => navigation.navigate('Attendance' as never)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardHeaderIcon, { backgroundColor: colors.successBg }]}>
                    <AppIcon name="calendar-check-outline" size={18} color={colors.success} />
                  </View>
                  <Text style={styles.cardTitle}>Today's Attendance</Text>
                </View>
                <AppIcon name="chevron-right" size={20} color={colors.textSecondary} />
              </View>

              {attendance.isHoliday ? (
                <View style={styles.holidayInline}>
                  <AppIcon name="party-popper" size={22} color={colors.warningAccent} />
                  <Text style={styles.holidayInlineText}>Holiday — no attendance today</Text>
                </View>
              ) : (
                <>
                  {/* Percentage + counts row */}
                  <View style={styles.attOverviewRow}>
                    <View style={styles.attPctCircle}>
                      <Text style={styles.attPctValue}>{attendancePct}%</Text>
                    </View>
                    <View style={styles.attCountsCol}>
                      <View style={styles.attCountRow}>
                        <View style={[styles.attCountDot, { backgroundColor: colors.success }]} />
                        <Text style={styles.attCountLabel}>Present</Text>
                        <Text style={[styles.attCountNum, { color: colors.success }]}>{attendance.presentCount}</Text>
                      </View>
                      <View style={styles.attCountRow}>
                        <View style={[styles.attCountDot, { backgroundColor: colors.textSecondary }]} />
                        <Text style={styles.attCountLabel}>Absent</Text>
                        <Text style={styles.attCountNum}>{attendance.absentCount}</Text>
                      </View>
                      <View style={styles.attCountRow}>
                        <View style={[styles.attCountDot, { backgroundColor: colors.primary }]} />
                        <Text style={styles.attCountLabel}>Total</Text>
                        <Text style={styles.attCountNum}>{totalStudents}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${attendancePct}%` as any }]} />
                  </View>

                  {/* Absent students preview */}
                  {attendance.absentCount > 0 && attendance.absentStudents.length > 0 && (
                    <View style={styles.absentPreview}>
                      <Text style={styles.absentPreviewTitle}>
                        Absent ({attendance.absentCount})
                      </Text>
                      <View style={styles.absentChipRow}>
                        {attendance.absentStudents.slice(0, 4).map((s) => (
                          <View key={s.studentId} style={styles.absentChip}>
                            <Text style={styles.absentChipText}>{s.fullName.split(' ')[0]}</Text>
                          </View>
                        ))}
                        {attendance.absentStudents.length > 4 && (
                          <View style={[styles.absentChip, styles.absentChipMore]}>
                            <Text style={styles.absentChipMoreText}>+{attendance.absentStudents.length - 4}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </>
              )}
            </TouchableOpacity>
          )}

          {/* ── Pending Requests Preview ── */}
          {pendingRequests.length > 0 && (
            <TouchableOpacity
              style={styles.requestsCard}
              onPress={() => navigation.navigate('Fees' as never)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardHeaderIcon, { overflow: 'hidden' }]}>
                    <LinearGradient
                      colors={[gradient.start, gradient.end]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <AppIcon name="file-document-outline" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.cardTitle}>My Pending Requests</Text>
                </View>
                <View style={styles.requestsBadge}>
                  <LinearGradient
                    colors={[gradient.start, gradient.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.requestsBadgeText}>{pendingRequests.length}</Text>
                </View>
              </View>

              {pendingRequests.slice(0, 3).map((req) => (
                <View key={req.id} style={styles.requestRow}>
                  <View style={styles.requestAvatar}>
                    <Text style={styles.requestInitial}>{(req.studentName ?? '?')[0]}</Text>
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName} numberOfLines={1}>
                      {req.studentName ?? 'Unknown'}
                    </Text>
                    <Text style={styles.requestMeta}>
                      {req.monthKey} · {formatCurrency(req.amount)}
                    </Text>
                  </View>
                  <View style={styles.requestStatusBadge}>
                    <Text style={styles.requestStatusText}>Pending</Text>
                  </View>
                </View>
              ))}

              {pendingRequests.length > 3 && (
                <View style={styles.viewAllBtn}>
                  <Text style={styles.viewAllText}>
                    View all {pendingRequests.length} requests
                  </Text>
                  
                  <AppIcon name="chevron-right" size={16} color={colors.textSecondary} />
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* ── Enquiry Summary ── */}
          {enquirySummary && enquirySummary.total > 0 && (
            <TouchableOpacity
              style={styles.enquiryCard}
              onPress={() => navigation.navigate('More', { screen: 'EnquiryList' } as never)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardHeaderIcon, { backgroundColor: colors.warningBg }]}>
                    
                    <AppIcon name="account-question-outline" size={18} color={colors.warning} />
                  </View>
                  <Text style={styles.cardTitle}>Enquiries</Text>
                </View>
                
                <AppIcon name="chevron-right" size={20} color={colors.textSecondary} />
              </View>

              <View style={styles.enquiryStats}>
                <View style={styles.enquiryStat}>
                  <Text style={[styles.enquiryStatValue, { color: colors.warning }]}>
                    {enquirySummary.active}
                  </Text>
                  <Text style={styles.enquiryStatLabel}>Active</Text>
                </View>
                <View style={styles.attendanceDivider} />
                <View style={styles.enquiryStat}>
                  <Text style={[styles.enquiryStatValue, { color: colors.text }]}>
                    {enquirySummary.todayFollowUp}
                  </Text>
                  <Text style={styles.enquiryStatLabel}>Follow-up Today</Text>
                </View>
                <View style={styles.attendanceDivider} />
                <View style={styles.enquiryStat}>
                  <Text style={[styles.enquiryStatValue, { color: colors.success }]}>
                    {enquirySummary.closed}
                  </Text>
                  <Text style={styles.enquiryStatLabel}>Closed</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Birthday Widget ── */}
          <BirthdayWidget students={birthdayStudents} />
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },

  /* ── Grid ───────────────────────────────────────── */
  gridRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  /* ── Stat Card ──────────────────────────────────── */
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    alignItems: 'center',
    ...shadows.sm,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  statSub: {
    marginTop: spacing.sm,
    backgroundColor: colors.successBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statSubText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.success,
  },

  /* ── Quick Actions ──────────────────────────────── */
  quickActionsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  sectionLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickActionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },

  /* ── Card shared ────────────────────────────────── */
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },

  /* ── Attendance Card ────────────────────────────── */
  attendanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  holidayInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningLightBg,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  holidayInlineText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.warningText,
  },
  attOverviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  attPctCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attPctValue: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  attCountsCol: {
    flex: 1,
    gap: spacing.sm,
  },
  attCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attCountDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  attCountLabel: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  attCountNum: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: radius.full,
  },
  absentPreview: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  absentPreviewTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  absentChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  absentChip: {
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  absentChipText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textMedium,
  },
  absentChipMore: {
    backgroundColor: colors.bgSubtle,
  },
  absentChipMoreText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  attendanceDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },

  /* ── Requests Card ──────────────────────────────── */
  requestsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  requestsBadge: {
    overflow: 'hidden',
    borderRadius: radius.full,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  requestsBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  requestAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  requestInitial: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  requestMeta: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  requestStatusBadge: {
    backgroundColor: colors.warningBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  requestStatusText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.warning,
  },

  /* ── Enquiry Card ───────────────────────────────── */
  enquiryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  enquiryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  enquiryStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  enquiryStatValue: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  enquiryStatLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },

  /* ── Shared ─────────────────────────────────────── */
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  viewAllText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
});
