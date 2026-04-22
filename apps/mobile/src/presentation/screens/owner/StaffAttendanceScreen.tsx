import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/ui/AppIcon';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import type { StaffStackParamList } from '../../navigation/StaffStack';
import type { DailyStaffAttendanceItem } from '../../../domain/staff-attendance/staff-attendance.types';
import { useStaffAttendance } from '../../../application/staff-attendance/use-staff-attendance';
import {
  getDailyStaffAttendance,
  markStaffAttendance,
} from '../../../infra/staff-attendance/staff-attendance-api';
import { getTodayIST } from '../../../application/attendance/use-attendance';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import { DatePickerRow } from '../../components/attendance/DatePickerRow';
import { HolidayBanner } from '../../components/attendance/HolidayBanner';
import { Toggle } from '../../components/ui/Toggle';
import { Badge } from '../../components/ui/Badge';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, shadows, listDefaults, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Nav = NativeStackNavigationProp<StaffStackParamList, 'StaffAttendance'>;

const staffAttendanceApi = { getDailyStaffAttendance, markStaffAttendance };

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function getMonthFromDate(dateStr: string): string {
  return dateStr.substring(0, 7);
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

type StaffAttendanceRowProps = {
  item: DailyStaffAttendanceItem;
  onToggle: () => void;
  isHoliday: boolean;
};

function StaffAttendanceRowComponent({ item, onToggle, isHoliday }: StaffAttendanceRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isPresent = item.status === 'PRESENT';

  // Holiday is a visual banner, not a block: API policy explicitly allows
  // staff attendance on holidays (unlike student attendance). Show the actual
  // present/absent status and keep the toggle interactive; rowCardHoliday
  // tint conveys the holiday context.
  return (
    <View style={[styles.rowCard, isHoliday && styles.rowCardHoliday]} testID={`staff-attendance-row-${item.staffUserId}`}>
      <InitialsAvatar
        name={item.fullName}
        size={40}
        style={styles.avatar}
      />

      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.fullName}
        </Text>
        <View style={styles.statusRow}>
          <Badge
            label={isPresent ? 'Present' : 'Absent'}
            variant={isPresent ? 'success' : 'danger'}
            dot
          />
        </View>
      </View>

      <Toggle
        value={isPresent}
        onValueChange={onToggle}
        accessibilityLabel={`${item.fullName} attendance toggle`}
        testID={`toggle-staff-${item.staffUserId}`}
      />
    </View>
  );
}

const StaffAttendanceRow = memo(StaffAttendanceRowComponent);

type SummaryBarProps = {
  items: DailyStaffAttendanceItem[];
};

function SummaryBarComponent({ items }: SummaryBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Memoize counts so they only recompute when `items` identity changes,
  // not on every parent re-render (e.g. pull-to-refresh, date selection).
  const { presentCount, totalCount, percentage, absentCount } = useMemo(() => {
    let present = 0;
    for (const item of items) if (item.status === 'PRESENT') present++;
    const total = items.length;
    return {
      presentCount: present,
      totalCount: total,
      absentCount: total - present,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  }, [items]);

  if (totalCount === 0) return null;

  return (
    <View style={styles.summaryBar}>
      <View style={styles.summaryLeft}>
        <View style={styles.summaryIconCircle}>
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="account-group" size={18} color="#FFFFFF" />
        </View>
        <View>
          <Text style={styles.summaryTitle}>
            {presentCount}/{totalCount} Present
          </Text>
          <Text style={styles.summarySubtitle}>{percentage}% attendance</Text>
        </View>
      </View>
      <View style={styles.summaryCountsRow}>
        <View style={[styles.summaryChip, { backgroundColor: colors.successBg }]}>
          <Text style={[styles.summaryChipText, { color: colors.success }]}>{presentCount}P</Text>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: colors.dangerBg }]}>
          <Text style={[styles.summaryChipText, { color: colors.danger }]}>{absentCount}A</Text>
        </View>
      </View>
    </View>
  );
}

const SummaryBar = memo(SummaryBarComponent);

export function StaffAttendanceScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();

  const [selectedDate, setSelectedDate] = useState(getTodayIST);
  const [refreshing, setRefreshing] = useState(false);

  const { items, loading, loadingMore, error, isHoliday, refetch, fetchMore, toggleStatus } =
    useStaffAttendance(selectedDate, staffAttendanceApi);

  const today = getTodayIST();
  const isToday = selectedDate === today;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // Handled by hook
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const goToPrev = useCallback(() => {
    setSelectedDate((d) => addDays(d, -1));
  }, []);

  const goToNext = useCallback(() => {
    if (!isToday) {
      setSelectedDate((d) => addDays(d, 1));
    }
  }, [isToday]);

  const goToToday = useCallback(() => {
    setSelectedDate(getTodayIST());
  }, []);

  const handleDailyReport = useCallback(() => {
    navigation.navigate('StaffAttendanceDailyReport', { date: selectedDate });
  }, [navigation, selectedDate]);

  const handleMonthlySummary = useCallback(() => {
    navigation.navigate('StaffAttendanceMonthlySummary', {
      month: getMonthFromDate(selectedDate),
    });
  }, [navigation, selectedDate]);

  const renderItem = useCallback(
    ({ item }: { item: DailyStaffAttendanceItem }) => (
      <StaffAttendanceRow
        item={item}
        onToggle={() => toggleStatus(item.staffUserId)}
        isHoliday={isHoliday}
      />
    ),
    [toggleStatus, isHoliday],
  );

  const keyExtractor = useCallback(
    (item: DailyStaffAttendanceItem) => item.staffUserId,
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

  const listHeader = useMemo(
    () => (
      <>
        <SummaryBar items={items} />
        {/* Action Cards */}
        <View style={styles.actionCards}>
          <Pressable
            style={styles.actionCard}
            onPress={handleDailyReport}
            accessibilityRole="button"
            accessibilityLabel="View daily report"
            testID="staff-daily-report-button"
          >
            <View style={[styles.actionIconCircle, { backgroundColor: colors.infoBg }]}>
              
              <AppIcon name="file-chart-outline" size={20} color={colors.info} />
            </View>
            <Text style={styles.actionCardLabel}>Daily Report</Text>
            
            <AppIcon name="chevron-right" size={18} color={colors.textDisabled} />
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={handleMonthlySummary}
            accessibilityRole="button"
            accessibilityLabel="View monthly summary"
            testID="staff-monthly-summary-button"
          >
            <View style={[styles.actionIconCircle, { overflow: 'hidden' }]}>
              <LinearGradient
                colors={[gradient.start, gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <AppIcon name="calendar-month-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.actionCardLabel}>Monthly Summary</Text>
            
            <AppIcon name="chevron-right" size={18} color={colors.textDisabled} />
          </Pressable>
        </View>
      </>
    ),
    [items, handleDailyReport, handleMonthlySummary, colors, styles],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <DatePickerRow
          date={selectedDate}
          onPrevious={goToPrev}
          onNext={goToNext}
          onToday={goToToday}
          isToday={isToday}
        />
      </View>

      {isHoliday && <HolidayBanner isOwner={false} />}

      {error && <InlineError message={error.message} onRetry={refetch} />}

      {loading && !refreshing ? (
        <View testID="skeleton-container" style={styles.skeletons}>
          <SkeletonTile />
          <SkeletonTile />
          <SkeletonTile />
        </View>
      ) : !loading && items.length === 0 ? (
        <EmptyState icon="account-off-outline" message="No staff members found" subtitle="Staff will appear here once added" />
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
          testID="staff-attendance-list"
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
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
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

  // ── Summary Bar ──
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  summaryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  summarySubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  summaryCountsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  summaryChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  summaryChipText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
  },

  // ── Action Cards ──
  actionCards: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  actionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  actionCardLabel: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },

  // ── Attendance Row ──
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarPresent: {
    backgroundColor: colors.successBg,
  },
  avatarAbsent: {
    backgroundColor: colors.dangerBg,
  },
  avatarHoliday: {
    backgroundColor: colors.warningBg,
  },
  avatarText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  avatarTextPresent: {
    color: colors.success,
  },
  avatarTextAbsent: {
    color: colors.danger,
  },
  avatarTextHoliday: {
    color: colors.warning,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowCardHoliday: {
    borderColor: colors.warningBorder,
  },
});
