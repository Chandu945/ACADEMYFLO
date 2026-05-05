import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/ui/AppIcon';
import type { ParentHomeStackParamList } from '../../navigation/ParentHomeStack';
import type {
  AcademyPaymentMethods,
  ChildAttendanceSummary,
  ChildFeeDue,
} from '../../../domain/parent/parent.types';
import { getChildAttendanceUseCase } from '../../../application/parent/use-cases/get-child-attendance.usecase';
import { getChildFeesUseCase } from '../../../application/parent/use-cases/get-child-fees.usecase';
import { parentApi } from '../../../infra/parent/parent-api';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { formatMonthKey, formatMonthShort, formatCurrency } from '../../utils/format';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentMonthIST, nowIST } from '../../../domain/common/date-utils';
import { AttendanceCalendar } from '../../components/attendance/AttendanceCalendar';

type Route = RouteProp<ParentHomeStackParamList, 'ChildDetail'>;
type Nav = NativeStackNavigationProp<ParentHomeStackParamList, 'ChildDetail'>;

function getCurrentMonth(): string {
  return getCurrentMonthIST();
}

function getMonthRange(): { from: string; to: string } {
  const d = nowIST();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const fromMonth = m - 5;
  const toMonth = m + 1;
  const fromYear = fromMonth <= 0 ? y - 1 : y;
  const fromM = fromMonth <= 0 ? fromMonth + 12 : fromMonth;
  const toYear = toMonth > 12 ? y + 1 : y;
  const toM = toMonth > 12 ? toMonth - 12 : toMonth;
  return {
    from: `${fromYear}-${String(fromM).padStart(2, '0')}`,
    to: `${toYear}-${String(toM).padStart(2, '0')}`,
  };
}

function AttendanceBar({
  label,
  count,
  total,
  color,
  icon,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  icon: string;
}) {
  const { colors } = useTheme();
  const bStyles = useMemo(() => makeBarStyles(colors), [colors]);
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={bStyles.row}>
      <View style={bStyles.labelRow}>
        
        <AppIcon name={icon} size={16} color={color} />
        <Text style={bStyles.label}>{label}</Text>
      </View>
      <View style={bStyles.barOuter}>
        <View style={[bStyles.barInner, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[bStyles.count, { color }]}>{count}</Text>
    </View>
  );
}

const makeBarStyles = (colors: Colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  barOuter: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  barInner: {
    height: 8,
    borderRadius: 4,
  },
  count: {
    width: 28,
    textAlign: 'right',
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
  },
});

function FeeStatusIcon({ status }: { status: string }) {
  const { colors } = useTheme();
  if (status === 'PAID') {
    
    return <AppIcon name="check-circle" size={20} color={colors.success} />;
  }
  if (status === 'DUE') {

    return <AppIcon name="clock-alert-outline" size={20} color={colors.warningAccent} />;
  }
  
  return <AppIcon name="clock-outline" size={20} color={colors.textDisabled} />;
}

export function ChildDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const studentId = route.params?.studentId ?? '';

  const [attendance, setAttendance] = useState<ChildAttendanceSummary | null>(null);
  const [fees, setFees] = useState<ChildFeeDue[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<AcademyPaymentMethods | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attMonth, setAttMonth] = useState(getCurrentMonthIST());
  const [attLoading, setAttLoading] = useState(false);
  const currentMonth = getCurrentMonthIST();
  const mountedRef = useRef(true);
  const todayMs = useMemo(() => { const d = nowIST(); d.setHours(0, 0, 0, 0); return d.getTime(); }, []);

  const navigateMonth = useCallback((delta: number) => {
    setAttMonth((prev) => {
      const [y, m] = prev.split('-').map(Number);
      const d = new Date(y!, m! - 1 + delta, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
  }, []);

  // Load attendance when month changes
  useEffect(() => {
    let cancelled = false;
    setAttLoading(true);
    getChildAttendanceUseCase({ parentApi }, studentId, attMonth).then((res) => {
      if (cancelled || !mountedRef.current) return;
      if (res.ok) setAttendance(res.value);
      setAttLoading(false);
    }).catch(() => { if (!cancelled) setAttLoading(false); });
    return () => { cancelled = true; };
  }, [studentId, attMonth]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const month = getCurrentMonth();
    const { from, to } = getMonthRange();

    try {
      const [attResult, feesResult, methodsResult] = await Promise.all([
        getChildAttendanceUseCase({ parentApi }, studentId, month),
        getChildFeesUseCase({ parentApi }, studentId, from, to),
        // Payment methods decide whether parents see the Pay button. Failing
        // this call is non-fatal — we just hide the button.
        parentApi.getAcademyPaymentMethods(),
      ]);

      if (!mountedRef.current) return;

      if (attResult.ok) setAttendance(attResult.value);
      if (feesResult.ok) setFees(feesResult.value);
      if (methodsResult.ok) setPaymentMethods(methodsResult.value);
      if (!attResult.ok && !feesResult.ok) {
        setError('Failed to load details. Pull down to retry.');
      }
    } catch (e) {
      if (__DEV__) console.error('[ChildDetailScreen] Load failed:', e);
      if (mountedRef.current) {
        setError('Something went wrong. Pull down to retry.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [studentId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } catch {
      // Handled inside load
    }
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  // Session-level: % of expected sessions actually attended across all batches.
  const attendancePct =
    attendance && attendance.expectedCount > 0
      ? Math.round((attendance.presentCount / attendance.expectedCount) * 100)
      : 0;

  const totalDue = fees
    .filter((f) => f.status === 'DUE')
    .reduce((sum, f) => sum + f.amount + f.lateFee, 0);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
      }
    >
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: colors.primary }]}>
          <Text style={styles.statValue}>{attendancePct}%</Text>
          <Text style={styles.statLabel}>Attendance</Text>
        </View>
        <View
          style={[
            styles.statCard,
            { borderLeftColor: totalDue > 0 ? colors.danger : colors.success },
          ]}
        >
          <Text style={styles.statValue}>{formatCurrency(totalDue)}</Text>
          <Text style={styles.statLabel}>{totalDue > 0 ? 'Due' : 'All Clear'}</Text>
        </View>
      </View>

      {/* Attendance Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          
          <AppIcon name="calendar-check-outline" size={20} color={colors.text} />
          <Text style={styles.sectionTitle}>Attendance</Text>
        </View>

        {/* Month Navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.monthNavBtn}>
            <AppIcon name="chevron-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{formatMonthKey(attMonth)}</Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.monthNavBtn} disabled={attMonth >= currentMonth}>
            <AppIcon name="chevron-right" size={22} color={attMonth >= currentMonth ? colors.textDisabled : colors.text} />
          </TouchableOpacity>
          {attMonth !== currentMonth && (
            <TouchableOpacity onPress={() => setAttMonth(currentMonth)} style={styles.monthResetBtn}>
              <Text style={{ color: colors.text, fontSize: fontSizes.xs, fontWeight: fontWeights.medium }}>This Month</Text>
            </TouchableOpacity>
          )}
        </View>

        {attLoading ? (
          <View style={[styles.sectionCard, { alignItems: 'center', padding: spacing.xl }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : attendance ? (
          <>
            {/* Summary row */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryChip, { backgroundColor: 'rgba(74, 222, 128, 0.1)', borderColor: 'rgba(74, 222, 128, 0.25)', borderWidth: 1 }]}>
                <Text style={[styles.summaryCount, { color: '#4ade80' }]}>{attendance.presentCount}</Text>
                <Text style={styles.summaryLabel}>Present</Text>
              </View>
              <View style={[styles.summaryChip, { backgroundColor: 'rgba(248, 113, 113, 0.1)', borderColor: 'rgba(248, 113, 113, 0.25)', borderWidth: 1 }]}>
                <Text style={[styles.summaryCount, { color: '#f87171' }]}>{attendance.absentCount}</Text>
                <Text style={styles.summaryLabel}>Absent</Text>
              </View>
              <View style={[styles.summaryChip, { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderColor: 'rgba(251, 191, 36, 0.25)', borderWidth: 1 }]}>
                <Text style={[styles.summaryCount, { color: '#fbbf24' }]}>{attendance.holidayCount}</Text>
                <Text style={styles.summaryLabel}>Holidays</Text>
              </View>
            </View>

            {/* Calendar grid */}
            <View style={styles.sectionCard}>
              <AttendanceCalendar
                month={attMonth}
                absentDates={attendance.absentDates}
                holidayDates={attendance.holidayDates}
              />
            </View>

            {/* Per-batch breakdown — only rendered for multi-batch students */}
            {attendance.perBatch.length > 1 && (
              <View style={[styles.sectionCard, { marginTop: spacing.sm }]}>
                <Text style={[styles.sectionTitle, { marginBottom: spacing.sm, fontSize: fontSizes.sm }]}>
                  By Session
                </Text>
                {attendance.perBatch.map((b) => {
                  const pct = b.expectedCount > 0
                    ? Math.round((b.presentCount / b.expectedCount) * 100)
                    : 0;
                  return (
                    <View key={b.batchId} style={styles.batchRow}>
                      <Text style={styles.batchName} numberOfLines={1}>{b.batchName}</Text>
                      <Text style={styles.batchCount}>
                        {b.presentCount}/{b.expectedCount}
                      </Text>
                      <Text style={styles.batchPct}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <View style={styles.sectionCard}>
            <Text style={styles.noData}>No attendance data available</Text>
          </View>
        )}
      </View>

      {/* Fee History Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          
          <AppIcon name="receipt" size={20} color={colors.text} />
          <Text style={styles.sectionTitle}>Fee History</Text>
        </View>
        {fees.map((fee) => (
          <View key={fee.id} style={styles.feeCard}>
            <View style={styles.feeRow}>
              <FeeStatusIcon status={fee.status} />
              <View style={styles.feeInfo}>
                <Text style={styles.feeMonth}>{formatMonthShort(fee.monthKey)}</Text>
                <View style={styles.feeStatusRow}>
                  <View
                    style={[
                      styles.feeBadge,
                      {
                        backgroundColor:
                          fee.status === 'PAID'
                            ? colors.successBg
                            : fee.status === 'DUE'
                              ? colors.warningLightBg
                              : colors.bgSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.feeBadgeText,
                        {
                          color:
                            fee.status === 'PAID'
                              ? colors.successText
                              : fee.status === 'DUE'
                                ? colors.warningText
                                : colors.textSecondary,
                        },
                      ]}
                    >
                      {fee.status}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.feeAmount}>
                {formatCurrency(fee.status === 'DUE' && fee.lateFee > 0 ? fee.amount + fee.lateFee : fee.amount)}
              </Text>
            </View>
            {fee.status === 'PAID' && (
              <TouchableOpacity
                style={styles.receiptButton}
                onPress={() => navigation.navigate('Receipt', { feeDueId: fee.id })}
              >
                
                <AppIcon name="file-document-outline" size={16} color={colors.successText} />
                <Text style={styles.receiptButtonText}>View Receipt</Text>
              </TouchableOpacity>
            )}
            {fee.status === 'DUE' && fee.lateFee > 0 && (
              <View style={styles.lateFeeNotice}>
                <AppIcon name="clock-alert-outline" size={14} color={colors.warningAccent} />
                <Text style={styles.lateFeeNoticeText}>
                  Late fee of {formatCurrency(fee.lateFee)} applied
                </Text>
              </View>
            )}
            {fee.status === 'DUE' && fee.lateFee === 0 &&
              todayMs > new Date(fee.dueDate + 'T00:00:00').getTime() && (
                <View style={styles.graceNotice}>

                  <AppIcon name="clock-alert-outline" size={14} color={colors.warning} />
                  <Text style={styles.graceNoticeText}>
                    Pay soon to avoid late fees
                  </Text>
                </View>
            )}
            {fee.status === 'DUE' && fee.pendingRequest ? (
              <View style={styles.pendingBadge} testID={`pending-fee-${fee.id}`}>
                <AppIcon name="clock-outline" size={14} color={colors.warningAccent} />
                <Text style={styles.pendingBadgeText}>
                  Payment of {formatCurrency(fee.pendingRequest.amount)} pending owner approval
                </Text>
              </View>
            ) : fee.status === 'DUE' && paymentMethods?.manualPaymentsEnabled ? (
              <TouchableOpacity
                style={styles.payButton}
                onPress={() =>
                  navigation.navigate('ManualPayment', {
                    feeDueId: fee.id,
                    studentId: fee.studentId,
                    monthKey: fee.monthKey,
                    amount: fee.amount + (fee.lateFee ?? 0),
                  })
                }
                testID={`pay-fee-${fee.id}`}
              >
                <AppIcon name="cash-fast" size={16} color={colors.white} />
                <Text style={styles.payButtonText}>Pay now</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
        {fees.length === 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.noData}>No fee records found</Text>
          </View>
        )}
        {fees.some((f) => f.status === 'DUE') && (
          <View style={styles.payAtAcademyNote}>
            <Text style={styles.payAtAcademyStar}>*</Text>
            <Text style={styles.payAtAcademyText}>
              Please visit the academy to pay your pending fees. Once paid, it will be updated here automatically.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorBanner: {
    backgroundColor: colors.warningLightBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: fontSizes.base, color: colors.dangerText },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderLeftWidth: 4,
    ...shadows.sm,
  },
  statValue: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    ...shadows.sm,
  },
  noData: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  feeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feeInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  feeMonth: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  feeStatusRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  feeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  feeBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  feeAmount: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.successBg,
    borderRadius: radius.md,
  },
  receiptButtonText: {
    color: colors.successText,
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.sm,
  },
  lateFeeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.warningLightBg,
    borderRadius: radius.sm,
  },
  lateFeeNoticeText: {
    fontSize: fontSizes.xs,
    color: colors.warningText,
    fontWeight: fontWeights.medium,
    flex: 1,
  },
  graceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.warningBg,
    borderRadius: radius.sm,
  },
  graceNoticeText: {
    fontSize: fontSizes.xs,
    color: colors.warning,
    fontWeight: fontWeights.medium,
    flex: 1,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.warningLightBg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  pendingBadgeText: {
    fontSize: fontSizes.xs,
    color: colors.warningText,
    fontWeight: fontWeights.semibold,
    flex: 1,
  },
  payButtonText: {
    color: colors.white,
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.sm,
    letterSpacing: 0.2,
  },
  payAtAcademyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  payAtAcademyStar: {
    color: colors.warning,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.lg,
    marginRight: spacing.xs,
    lineHeight: 20,
  },
  payAtAcademyText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    fontStyle: 'italic' as const,
  },

  /* Month Navigation */
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  monthNavBtn: {
    padding: spacing.xs,
  },
  monthLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    minWidth: 100,
    textAlign: 'center',
  },
  monthResetBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  /* Summary chips */
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryChip: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
  },
  summaryLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  batchName: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  batchCount: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  batchPct: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    minWidth: 38,
    textAlign: 'right',
  },
});
