import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getDailyReport } from '../../../infra/attendance/attendance-api';
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
  const mountedRef = useRef(true);

  const loadMonth = useCallback(async () => {
    setLoading(true);
    const totalDays = getDaysInMonth(year, month);
    const today = new Date();

    const maxDay =
      year === today.getFullYear() && month === today.getMonth() + 1
        ? today.getDate()
        : totalDays;

    const monthKey = formatMonthKey(year, month);
    const results: DayData[] = [];

    for (let start = 1; start <= maxDay; start += 7) {
      const end = Math.min(start + 6, maxDay);
      const batch = [];
      for (let d = start; d <= end; d++) {
        const dateStr = `${monthKey}-${String(d).padStart(2, '0')}`;
        batch.push(
          getDailyReport(dateStr).then((res) => ({
            day: d,
            present: res.ok ? res.value.presentCount : 0,
            absent: res.ok ? res.value.absentCount : 0,
            isHoliday: res.ok ? res.value.isHoliday : false,
          })),
        );
      }
      const batchResults = await Promise.all(batch);
      if (!mountedRef.current) return;
      results.push(...batchResults);
    }

    for (let d = maxDay + 1; d <= totalDays; d++) {
      results.push({ day: d, present: 0, absent: 0, isHoliday: false });
    }

    results.sort((a, b) => a.day - b.day);
    setDays(results);
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
          {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
          <Icon name="calendar-check-outline" size={20} color={colors.primary} />
          <Text style={styles.title}>Attendance Summary</Text>
          {onPress && (
            // @ts-expect-error react-native-vector-icons types incompatible with @types/react@19
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goBack} style={styles.navBtn} testID="attendance-month-back">
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="chevron-left" size={20} color={colors.textLight} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{getMonthLabel(year, month)}</Text>
          <TouchableOpacity onPress={goForward} style={styles.navBtn} testID="attendance-month-forward">
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="chevron-right" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chart */}
      {loading ? (
        <View style={styles.chartPlaceholder}>
          <ActivityIndicator size="small" color={colors.primary} />
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
                            { height: Math.max(absentH, 2), backgroundColor: '#ef4444' },
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
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
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
    marginTop: spacing.md,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginHorizontal: spacing.sm,
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
