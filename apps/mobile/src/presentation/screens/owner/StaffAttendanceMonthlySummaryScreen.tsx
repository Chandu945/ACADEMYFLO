import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/ui/AppIcon';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import type { StaffStackParamList } from '../../navigation/StaffStack';
import type { AppError } from '../../../domain/common/errors';
import type { MonthlyStaffSummaryItem } from '../../../domain/staff-attendance/staff-attendance.types';
import { getStaffMonthlySummaryUseCase } from '../../../application/staff-attendance/use-cases/get-staff-monthly-summary.usecase';
import { getStaffMonthlySummary } from '../../../infra/staff-attendance/staff-attendance-api';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import { spacing, fontSizes, fontWeights, radius, shadows, listDefaults } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Route = RouteProp<StaffStackParamList, 'StaffAttendanceMonthlySummary'>;

const summaryApi = { getStaffMonthlySummary };
const PAGE_SIZE = 50;

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const d = new Date(parseInt(year!, 10), parseInt(month!, 10) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

type SummaryRowProps = {
  item: MonthlyStaffSummaryItem;
  onPress: (item: MonthlyStaffSummaryItem) => void;
};

function SummaryRowComponent({ item, onPress }: SummaryRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const expected = item.presentCount + item.absentCount;
  const hasData = expected > 0;
  const pct = hasData ? Math.round((item.presentCount / expected) * 100) : null;
  const tone =
    pct == null ? 'neutral' : pct >= 90 ? 'success' : pct >= 75 ? 'warning' : 'danger';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        styles[`rowStripe_${tone}`],
        pressed && { opacity: 0.7 },
      ]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.fullName}, ${pct ?? 0} percent attendance. Tap for details.`}
      testID={`staff-summary-row-${item.staffUserId}`}
    >
      <InitialsAvatar
        name={item.fullName}
        size={40}
        variant="palette"
        style={styles.avatar}
      />
      <View style={styles.rowInfo}>
        <Text style={styles.name} numberOfLines={1}>{item.fullName}</Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {hasData
            ? `${item.presentCount} of ${expected} days · ${item.holidayCount} holidays`
            : 'No scheduled days yet'}
        </Text>
      </View>
      <View style={[styles.pctBadge, styles[`pctBadge_${tone}`]]}>
        <Text style={[styles.pctText, styles[`pctText_${tone}`]]}>
          {hasData ? `${pct}%` : '—'}
        </Text>
      </View>
    </Pressable>
  );
}

const SummaryRow = memo(SummaryRowComponent);

// Same screen is registered in both StaffStack and MoreStack; both stacks
// declare `StaffMonthlyAttendance` so this navigation type covers either.
type Nav = NativeStackNavigationProp<StaffStackParamList, 'StaffAttendanceMonthlySummary'>;

export function StaffAttendanceMonthlySummaryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const month = route.params?.month ?? '';

  const handleRowPress = useCallback(
    (item: MonthlyStaffSummaryItem) => {
      navigation.navigate('StaffMonthlyAttendance', {
        staffUserId: item.staffUserId,
        fullName: item.fullName,
        month,
      });
    },
    [navigation, month],
  );

  const [items, setItems] = useState<MonthlyStaffSummaryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);
  const fetchingMoreRef = useRef(false);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await getStaffMonthlySummaryUseCase(
          { staffAttendanceApi: summaryApi },
          month,
          targetPage,
          PAGE_SIZE,
        );

        if (!mountedRef.current) return;

        if (result.ok) {
          if (append) {
            setItems((prev) => [...prev, ...result.value.items]);
          } else {
            setItems(result.value.items);
          }
          setPage(targetPage);
          setHasMore(targetPage < result.value.meta.totalPages);
        } else {
          setError(result.error);
        }
      } catch (e) {
        if (__DEV__) console.error('[StaffAttendanceMonthlySummary] Load failed:', e);
        if (mountedRef.current) {
          setError({ code: 'UNKNOWN', message: 'Something went wrong.' });
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
          fetchingMoreRef.current = false;
        }
      }
    },
    [month],
  );

  const fetchMore = useCallback(() => {
    if (fetchingMoreRef.current || loading || loadingMore || !hasMore) return;
    fetchingMoreRef.current = true;
    load(page + 1, true);
  }, [loading, loadingMore, hasMore, page, load]);

  useEffect(() => {
    mountedRef.current = true;
    load(1, false);
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load(1, false);
    } catch {
      // Handled by load
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const renderItem = useCallback(
    ({ item }: { item: MonthlyStaffSummaryItem }) => (
      <SummaryRow item={item} onPress={handleRowPress} />
    ),
    [handleRowPress],
  );

  const keyExtractor = useCallback(
    (item: MonthlyStaffSummaryItem) => item.staffUserId,
    [],
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [loadingMore, colors, styles]);

  // Compute aggregate stats for header.
  // Headline numbers: average attendance % across staff, plus total marked
  // sessions out of expected. We deliberately don't surface "Total Absent"
  // as a big red number — when no one is marked yet, that reads as 60 person-
  // days absent (10 staff × 6 elapsed days), which is alarming but uninformative.
  const stats = useMemo(() => {
    if (items.length === 0) return null;
    let totalPresent = 0;
    let totalAbsent = 0;
    let pctSum = 0;
    let staffWithData = 0;
    for (const item of items) {
      totalPresent += item.presentCount;
      totalAbsent += item.absentCount;
      const expected = item.presentCount + item.absentCount;
      if (expected > 0) {
        pctSum += (item.presentCount / expected) * 100;
        staffWithData++;
      }
    }
    const expectedSessions = totalPresent + totalAbsent;
    // Use unweighted average of per-staff percentages — matches the
    // intuition "average staff is at X%". A weighted (totalPresent /
    // expectedSessions) version is biased by staff with more scheduled days.
    const avgPercentage = staffWithData > 0 ? Math.round(pctSum / staffWithData) : null;
    return {
      totalPresent,
      expectedSessions,
      avgPercentage,
      staffCount: items.length,
    };
  }, [items]);

  const listHeader = useMemo(() => {
    if (!stats) {
      return (
        <View style={styles.monthHeader}>
          <AppIcon name="calendar-month" size={20} color={colors.textSecondary} />
          <Text style={styles.monthLabel}>{formatMonth(month)}</Text>
        </View>
      );
    }
    const tone =
      stats.avgPercentage == null
        ? 'neutral'
        : stats.avgPercentage >= 90
          ? 'success'
          : stats.avgPercentage >= 75
            ? 'warning'
            : 'danger';
    return (
      <>
        {/* Month Header */}
        <View style={styles.monthHeader}>
          <AppIcon name="calendar-month" size={20} color={colors.textSecondary} />
          <Text style={styles.monthLabel}>{formatMonth(month)}</Text>
        </View>

        {/* Aggregate Stats Card */}
        <View style={[styles.statsCard, styles[`statsCard_${tone}`]]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  { color: tone === 'neutral' ? colors.textSecondary : colors[tone === 'success' ? 'successText' : tone === 'warning' ? 'warningText' : 'dangerText'] },
                ]}
              >
                {stats.avgPercentage == null ? '—' : `${stats.avgPercentage}%`}
              </Text>
              <Text style={styles.statLabel}>Avg attendance</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats.totalPresent}
                <Text style={styles.statValueSubtle}> / {stats.expectedSessions}</Text>
              </Text>
              <Text style={styles.statLabel}>Days marked</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.staffCount}</Text>
              <Text style={styles.statLabel}>Staff</Text>
            </View>
          </View>
        </View>

        {/* Section Title */}
        {items.length > 0 && (
          <View style={styles.sectionHeader}>
            <AppIcon name="account-multiple-outline" size={18} color={colors.text} />
            <Text style={styles.sectionTitle}>Staff Members ({items.length})</Text>
          </View>
        )}
      </>
    );
  }, [month, stats, items.length, colors, styles]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      {error && (
        <View style={styles.errorPad}>
          <InlineError message={error.message} onRetry={() => load(1, false)} />
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.skeletons}>
          <SkeletonTile />
          <SkeletonTile />
          <SkeletonTile />
        </View>
      ) : items.length === 0 ? (
        <EmptyState icon="chart-box-outline" message="No staff attendance data" subtitle="Attendance will appear once staff are marked" />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeader}
          onEndReached={fetchMore}
          onEndReachedThreshold={0.3}
          removeClippedSubviews
          windowSize={11}
          maxToRenderPerBatch={5}
          ListFooterComponent={renderFooter}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          contentContainerStyle={styles.listContent}
          testID="staff-monthly-summary-list"
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  errorPad: {
    padding: spacing.base,
  },
  skeletons: {
    padding: spacing.base,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: listDefaults.contentPaddingBottomNoFab,
  },
  footer: {
    paddingVertical: spacing.base,
    alignItems: 'center',
  },

  // ── Month Header ──
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  monthLabel: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },

  // ── Stats Card ──
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    ...shadows.md,
  },
  statsCard_success: { borderLeftColor: colors.success },
  statsCard_warning: { borderLeftColor: colors.warning },
  statsCard_danger: { borderLeftColor: colors.danger },
  statsCard_neutral: { borderLeftColor: colors.border },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: -0.5,
  },
  statValueSubtle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    letterSpacing: 0,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: fontWeights.semibold,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },

  // ── Summary Row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs + 2,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    ...shadows.sm,
  },
  rowStripe_success: { borderLeftColor: colors.success },
  rowStripe_warning: { borderLeftColor: colors.warning },
  rowStripe_danger: { borderLeftColor: colors.danger },
  rowStripe_neutral: { borderLeftColor: colors.border },
  avatar: {
    flexShrink: 0,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  pctBadge: {
    minWidth: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pctBadge_success: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
  pctBadge_warning: { backgroundColor: colors.warningBg, borderColor: colors.warningBorder },
  pctBadge_danger: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder },
  pctBadge_neutral: { backgroundColor: colors.bgSubtle, borderColor: colors.border },
  pctText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.2,
  },
  pctText_success: { color: colors.successText },
  pctText_warning: { color: colors.warningText },
  pctText_danger: { color: colors.dangerText },
  pctText_neutral: { color: colors.textSecondary },
});
