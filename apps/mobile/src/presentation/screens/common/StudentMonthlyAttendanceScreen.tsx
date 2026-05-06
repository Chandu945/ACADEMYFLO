import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import type { AttendanceStackParamList } from '../../navigation/AttendanceStack';
import type { AppError } from '../../../domain/common/errors';
import type { StudentMonthlyDetail } from '../../../domain/attendance/attendance.types';
import { getStudentMonthlyDetailUseCase } from '../../../application/attendance/use-cases/get-student-monthly-detail.usecase';
import { getStudentMonthlyDetail } from '../../../infra/attendance/attendance-api';
import { exportStudentMonthlyAttendancePdfUseCase } from '../../../application/reports/use-cases/export-student-monthly-attendance-pdf.usecase';
import { getStudentMonthlyAttendancePdfUrl } from '../../../infra/reports/reports-api';
import { pdfDownload } from '../../../infra/reports/pdf-download';
import { AttendanceCalendar } from '../../components/attendance/AttendanceCalendar';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { AppIcon } from '../../components/ui/AppIcon';
import { useToast } from '../../context/ToastContext';
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
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();
  const mountedRef = useRef(true);

  const handleExportPdf = useCallback(async () => {
    if (exporting || !studentId) return;
    setExporting(true);
    try {
      const result = await exportStudentMonthlyAttendancePdfUseCase(
        { pdfDownload, getExportUrl: getStudentMonthlyAttendancePdfUrl },
        studentId,
        month,
      );
      if (result.ok) {
        showToast('Report downloaded', 'success');
      } else {
        showToast(result.error.message ?? 'Could not download report', 'error');
      }
    } finally {
      if (mountedRef.current) setExporting(false);
    }
  }, [exporting, studentId, month, showToast]);

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

  // Day-level metrics (use new fields when present, fall back to session
  // counts so the screen still renders against an un-redeployed API).
  const expectedDays = detail.expectedDays ?? detail.expectedCount;
  const presentDays = detail.presentDays ?? detail.presentCount;
  const absentDays = detail.absentDays ?? detail.absentCount;
  const partialDays = detail.partialDays ?? 0;
  const fullDays = Math.max(0, presentDays - partialDays);
  const pct = expectedDays > 0 ? Math.round((presentDays / expectedDays) * 100) : null;
  const tone =
    pct == null ? 'neutral' : pct >= 90 ? 'success' : pct >= 75 ? 'warning' : 'danger';

  const dateItems = [
    ...detail.absentDates.map((d) => ({ date: d, type: 'ABSENT' as const })),
    ...detail.holidayDates.map((d) => ({ date: d, type: 'HOLIDAY' as const })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {fullName ? <Text style={styles.studentName} accessibilityRole="header">{fullName}</Text> : null}
      <Text style={styles.monthLabel}>{new Date(detail.month + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
      <View style={styles.exportRow}>
        <Pressable
          onPress={handleExportPdf}
          disabled={exporting}
          style={({ pressed }) => [
            styles.exportBtn,
            exporting && styles.exportBtnDisabled,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Export this student's attendance as PDF"
          testID="export-student-attendance-pdf"
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <AppIcon name="download" size={14} color={colors.primary} />
              <Text style={styles.exportBtnText}>Export PDF</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Headline card: prominent percentage + day-level summary */}
      <View style={[styles.headlineCard, styles[`headlineCard_${tone}`]]}>
        <View style={styles.headlineLeft}>
          <Text style={[styles.headlinePct, styles[`headlinePctText_${tone}`]]}>
            {pct == null ? '—' : `${pct}%`}
          </Text>
          <Text style={styles.headlineLabel}>
            {expectedDays > 0 ? `${presentDays} of ${expectedDays} days` : 'No scheduled days yet'}
          </Text>
        </View>
        <View style={styles.headlineDivider} />
        <View style={styles.headlineRight}>
          <View style={styles.miniStat}>
            <Text style={[styles.miniStatNum, { color: colors.success }]}>{fullDays}</Text>
            <Text style={styles.miniStatLabel}>Full</Text>
          </View>
          {partialDays > 0 && (
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatNum, { color: colors.warning }]}>{partialDays}</Text>
              <Text style={styles.miniStatLabel}>Partial</Text>
            </View>
          )}
          <View style={styles.miniStat}>
            <Text style={[styles.miniStatNum, { color: colors.danger }]}>{absentDays}</Text>
            <Text style={styles.miniStatLabel}>Absent</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={[styles.miniStatNum, { color: colors.warning }]}>{detail.holidayCount}</Text>
            <Text style={styles.miniStatLabel}>Holiday</Text>
          </View>
        </View>
      </View>

      {/* Per-batch breakdown — session-level info that's actually useful per batch */}
      {detail.perBatch.length > 0 && (
        <View style={styles.batchCard}>
          <Text style={styles.cardTitle}>By Batch</Text>
          {detail.perBatch.map((b) => {
            const batchPct = b.expectedCount > 0
              ? Math.round((b.presentCount / b.expectedCount) * 100)
              : null;
            const batchTone =
              batchPct == null ? 'neutral' : batchPct >= 90 ? 'success' : batchPct >= 75 ? 'warning' : 'danger';
            return (
              <View key={b.batchId} style={styles.batchRow}>
                <View style={styles.batchInfo}>
                  <Text style={styles.batchName} numberOfLines={1}>{b.batchName}</Text>
                  <Text style={styles.batchSub}>
                    {b.expectedCount > 0
                      ? `${b.presentCount} of ${b.expectedCount} sessions`
                      : 'No scheduled sessions yet'}
                  </Text>
                </View>
                <View style={[styles.batchPct, styles[`pctBadge_${batchTone}`]]}>
                  <Text style={[styles.batchPctText, styles[`pctText_${batchTone}`]]}>
                    {batchPct == null ? '—' : `${batchPct}%`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

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
    marginBottom: spacing.sm,
  },
  exportRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.primarySoft,
    minHeight: 32,
  },
  exportBtnDisabled: {
    opacity: 0.5,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.2,
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
    flexWrap: 'wrap',
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
  batchCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: spacing.sm,
  },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  batchInfo: {
    flex: 1,
    minWidth: 0,
  },
  batchName: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  batchSub: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  batchPct: {
    minWidth: 52,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignItems: 'center',
    borderWidth: 1,
  },
  batchPctText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
  },
  pctBadge_success: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
  pctBadge_warning: { backgroundColor: colors.warningBg, borderColor: colors.warningBorder },
  pctBadge_danger: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder },
  pctBadge_neutral: { backgroundColor: colors.bgSubtle, borderColor: colors.border },
  pctText_success: { color: colors.successText },
  pctText_warning: { color: colors.warningText },
  pctText_danger: { color: colors.dangerText },
  pctText_neutral: { color: colors.textSecondary },
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
