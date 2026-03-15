import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0] ?? '';
    const last = parts[parts.length - 1] ?? '';
    return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

type SummaryRowProps = {
  item: MonthlyStaffSummaryItem;
};

function SummaryRowComponent({ item }: SummaryRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const totalDays = item.presentCount + item.absentCount;
  const percentage = totalDays > 0 ? Math.round((item.presentCount / totalDays) * 100) : 0;
  const barWidth = totalDays > 0 ? (item.presentCount / totalDays) * 100 : 0;

  return (
    <View style={styles.row} testID={`staff-summary-row-${item.staffUserId}`}>
      <View style={styles.rowTop}>
        <View style={[styles.avatar, percentage >= 75 ? styles.avatarGood : styles.avatarWarn]}>
          <Text style={[styles.avatarText, percentage >= 75 ? styles.avatarTextGood : styles.avatarTextWarn]}>
            {getInitials(item.fullName)}
          </Text>
        </View>
        <View style={styles.rowNameSection}>
          <Text style={styles.name} numberOfLines={1}>{item.fullName}</Text>
          <Text style={styles.rowSubtitle}>{percentage}% attendance</Text>
        </View>
        <View style={styles.rowCounts}>
          <View style={[styles.countChip, { backgroundColor: colors.successBg }]}>
            <Text style={[styles.countChipText, { color: colors.success }]}>{item.presentCount}P</Text>
          </View>
          <View style={[styles.countChip, { backgroundColor: colors.dangerBg }]}>
            <Text style={[styles.countChipText, { color: colors.danger }]}>{item.absentCount}A</Text>
          </View>
        </View>
      </View>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${barWidth}%`,
              backgroundColor: percentage >= 75 ? colors.success : colors.warning,
            },
          ]}
        />
      </View>
    </View>
  );
}

const SummaryRow = memo(SummaryRowComponent);

export function StaffAttendanceMonthlySummaryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute<Route>();
  const month = route.params?.month ?? '';

  const [items, setItems] = useState<MonthlyStaffSummaryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

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

      setLoading(false);
      setLoadingMore(false);
    },
    [month],
  );

  const fetchMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      load(page + 1, true);
    }
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
    await load(1, false);
    setRefreshing(false);
  }, [load]);

  const renderItem = useCallback(
    ({ item }: { item: MonthlyStaffSummaryItem }) => (
      <SummaryRow item={item} />
    ),
    [],
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

  // Compute aggregate stats for header
  const stats = useMemo(() => {
    if (items.length === 0) return null;
    let totalPresent = 0;
    let totalAbsent = 0;
    for (const item of items) {
      totalPresent += item.presentCount;
      totalAbsent += item.absentCount;
    }
    const totalDays = totalPresent + totalAbsent;
    const avgPercentage = totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;
    return { totalPresent, totalAbsent, avgPercentage, staffCount: items.length };
  }, [items]);

  const listHeader = useMemo(
    () => (
      <>
        {/* Month Header */}
        <View style={styles.monthHeader}>
          {/* @ts-expect-error react-native-vector-icons types */}
          <Icon name="calendar-month" size={20} color={colors.primary} />
          <Text style={styles.monthLabel}>{formatMonth(month)}</Text>
        </View>

        {/* Aggregate Stats Card */}
        {stats && (
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{stats.avgPercentage}%</Text>
                <Text style={styles.statLabel}>Avg Attendance</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.success }]}>{stats.totalPresent}</Text>
                <Text style={styles.statLabel}>Total Present</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.danger }]}>{stats.totalAbsent}</Text>
                <Text style={styles.statLabel}>Total Absent</Text>
              </View>
            </View>
          </View>
        )}

        {/* Section Title */}
        {items.length > 0 && (
          <View style={styles.sectionHeader}>
            {/* @ts-expect-error react-native-vector-icons types */}
            <Icon name="account-multiple-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.sectionTitle}>Staff Members ({items.length})</Text>
          </View>
        )}
      </>
    ),
    [month, stats, items.length, colors, styles],
  );

  return (
    <View style={styles.screen}>
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
          ListFooterComponent={renderFooter}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          contentContainerStyle={styles.listContent}
          testID="staff-monthly-summary-list"
        />
      )}
    </View>
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
    ...shadows.md,
  },
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
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarGood: {
    backgroundColor: colors.successBg,
  },
  avatarWarn: {
    backgroundColor: colors.warningBg,
  },
  avatarText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  avatarTextGood: {
    color: colors.success,
  },
  avatarTextWarn: {
    color: colors.warning,
  },
  rowNameSection: {
    flex: 1,
  },
  name: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rowCounts: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  countChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  countChipText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
  },

  // ── Progress Bar ──
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
});
