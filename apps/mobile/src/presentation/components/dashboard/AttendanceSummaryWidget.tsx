import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import { getMonthDailyCounts } from '../../../infra/attendance/attendance-api';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type DayData = {
  day: number;
  present: number;
  absent: number;
  isHoliday: boolean;
};

const BAR_MAX_HEIGHT = 80;

// Client-side cache for past months (they won't change)
const monthCache = new Map<string, DayData[]>();

/** Clear cached data (call on logout to prevent cross-user data leak) */
export function clearAttendanceSummaryCache(): void {
  monthCache.clear();
}

function getMonthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function isCurrentMonth(year: number, month: number): boolean {
  const now = new Date();
  return year === now.getFullYear() && month === now.getMonth() + 1;
}

type AttendanceSummaryWidgetProps = {
  onPress?: () => void;
};

export function AttendanceSummaryWidget({ onPress }: AttendanceSummaryWidgetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const loadMonth = useCallback(async () => {
    const monthKey = formatMonthKey(year, month);
    const isCurrent = isCurrentMonth(year, month);

    // Use cache for past months
    if (!isCurrent && monthCache.has(monthKey)) {
      setDays(monthCache.get(monthKey)!);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Single API call instead of 30 individual calls
    const result = await getMonthDailyCounts(monthKey);
    if (!mountedRef.current) return;

    if (result.ok) {
      const { totalStudents, days: apiDays } = result.value;
      const today = new Date();
      const totalDaysInMonth = getDaysInMonth(year, month);
      const maxDay = isCurrent ? today.getDate() : totalDaysInMonth;

      const dayData: DayData[] = apiDays.map((d, idx) => {
        const dayNum = idx + 1;
        if (dayNum > maxDay) {
          return { day: dayNum, present: 0, absent: 0, isHoliday: false };
        }
        const presentCount = d.isHoliday ? 0 : totalStudents - d.absentCount;
        return {
          day: dayNum,
          present: presentCount,
          absent: d.absentCount,
          isHoliday: d.isHoliday,
        };
      });

      // Cache past months
      if (!isCurrent) {
        monthCache.set(monthKey, dayData);
      }

      setDays(dayData);
    } else {
      // Surface load failure with a code-aware message and clear the chart so
      // the user doesn't think empty bars mean "no attendance was marked".
      const code = result.error.code;
      const msg =
        code === 'NETWORK' || code === 'UNKNOWN'
          ? 'Could not load attendance. Check your connection.'
          : code === 'FORBIDDEN'
            ? 'You do not have permission to view this summary.'
            : result.error.message;
      setError(msg);
      setDays([]);
    }

    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    mountedRef.current = true;
    loadMonth();
    return () => {
      mountedRef.current = false;
    };
  }, [loadMonth]);

  const goBack = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goForward = () => {
    const n = new Date();
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    if (nextYear > n.getFullYear() || (nextYear === n.getFullYear() && nextMonth > n.getMonth() + 1)) {
      return;
    }
    setYear(nextYear);
    setMonth(nextMonth);
  };

  const maxValue = Math.max(...days.map((d) => d.present + d.absent), 1);
  const totalPresent = days.reduce((s, d) => s + d.present, 0);
  const totalAbsent = days.reduce((s, d) => s + d.absent, 0);
  const holidayCount = days.filter((d) => d.isHoliday).length;

  return (
    <View style={styles.container} testID="attendance-summary-widget">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
          
          <AppIcon name="calendar-check-outline" size={20} color={colors.primary} />
          <Text style={styles.title}>Attendance Summary</Text>
          {onPress && (
            
            <AppIcon name="chevron-right" size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goBack} style={styles.navBtn} accessibilityLabel="Previous month" accessibilityRole="button" testID="attendance-month-back">
            
            <AppIcon name="chevron-left" size={20} color={colors.textLight} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{getMonthLabel(year, month)}</Text>
          <TouchableOpacity onPress={goForward} style={styles.navBtn} accessibilityLabel="Next month" accessibilityRole="button" testID="attendance-month-forward">
            
            <AppIcon name="chevron-right" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chart */}
      {loading ? (
        <View style={styles.chartPlaceholder}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.chartPlaceholder}>
          <Text style={{ color: colors.danger, fontSize: fontSizes.sm, textAlign: 'center' }}>
            {error}
          </Text>
          <TouchableOpacity onPress={loadMonth} style={{ marginTop: spacing.sm }}>
            <Text style={{ color: colors.primary, fontWeight: fontWeights.semibold }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
          <View style={styles.chart}>
            {days.map((d) => {
              const presentH = maxValue > 0 ? (d.present / maxValue) * BAR_MAX_HEIGHT : 0;
              const absentH = maxValue > 0 ? (d.absent / maxValue) * BAR_MAX_HEIGHT : 0;

              return (
                <View key={d.day} style={styles.barGroup}>
                  <View style={styles.bars}>
                    {d.isHoliday ? (
                      <View style={styles.holidayBar} />
                    ) : (
                      <>
                        <View
                          style={[
                            styles.bar,
                            { height: Math.max(presentH, 2), backgroundColor: colors.success },
                          ]}
                        />
                        <View
                          style={[
                            styles.bar,
                            { height: Math.max(absentH, 2), backgroundColor: colors.danger },
                          ]}
                        />
                      </>
                    )}
                  </View>
                  <Text style={styles.dayLabel}>{d.day}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>Present {totalPresent}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
          <Text style={styles.legendText}>Absent {totalAbsent}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Holiday {holidayCount}</Text>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginTop: spacing.sm,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    flexShrink: 1,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
    flexShrink: 1,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.full,
    paddingVertical: 3,
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  monthLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginHorizontal: spacing.md,
  },
  chartPlaceholder: {
    height: BAR_MAX_HEIGHT + 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartScroll: {
    marginBottom: spacing.sm,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_MAX_HEIGHT + 24,
    paddingTop: spacing.xs,
  },
  barGroup: {
    alignItems: 'center',
    marginHorizontal: 2,
    width: 20,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
  },
  bar: {
    width: 8,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    minHeight: 2,
  },
  holidayBar: {
    height: 4,
    backgroundColor: colors.primary,
    width: 14,
    borderRadius: 2,
  },
  dayLabel: {
    fontSize: 9,
    color: colors.textDisabled,
    marginTop: 3,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
});
