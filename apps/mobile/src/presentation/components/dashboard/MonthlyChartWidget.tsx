import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MonthlyChartPoint } from '../../../domain/dashboard/dashboard.types';
import { getMonthlyChart } from '../../../infra/dashboard/dashboard-api';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

// Client-side cache for past years (data won't change)
const chartCache = new Map<number, MonthlyChartPoint[]>();

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const BAR_MAX_HEIGHT = 120;
const INCOME_COLOR = '#16a34a';
const INCOME_BG = '#ecfdf5';
const EXPENSE_COLOR = '#ef4444';
const EXPENSE_BG = '#fef2f2';
const GRIDLINE_COUNT = 4;

function formatCurrency(n: number): string {
  if (n >= 100000) return `\u20B9${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `\u20B9${(n / 1000).toFixed(1)}K`;
  return `\u20B9${n}`;
}

function formatCurrencyFull(n: number): string {
  return `\u20B9${n.toLocaleString('en-IN')}`;
}

type MonthlyChartWidgetProps = {
  onPress?: () => void;
};

export function MonthlyChartWidget({ onPress }: MonthlyChartWidgetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed

  const [data, setData] = useState<MonthlyChartPoint[] | null>(null);
  const [year, setYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setSelectedMonth(null);

    // Use cache for past years
    if (year < currentYear && chartCache.has(year)) {
      setData(chartCache.get(year)!);
      return;
    }

    setData(null);
    const result = await getMonthlyChart(year);
    if (!mountedRef.current) return;
    if (result.ok) {
      setData(result.value.data);
      // Cache past years (won't change)
      if (year < currentYear) {
        chartCache.set(year, result.value.data);
      }
    }
  }, [year, currentYear]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  if (!data) return null;

  const maxValue = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);
  const totalIncome = data.reduce((s, d) => s + d.income, 0);
  const totalExpense = data.reduce((s, d) => s + d.expense, 0);
  const netAmount = totalIncome - totalExpense;
  const isProfit = netAmount >= 0;
  const isCurrentYear = year === currentYear;

  const selected = selectedMonth != null ? data[selectedMonth] : null;

  // Gridline values
  const gridValues = Array.from({ length: GRIDLINE_COUNT }, (_, i) =>
    Math.round((maxValue / GRIDLINE_COUNT) * (i + 1)),
  );

  return (
    <View style={styles.container} testID="monthly-chart-widget">
      {/* ── Header with year navigation ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
          <View style={styles.iconCircle}>
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="chart-bar" size={18} color={colors.primary} />
          </View>
          <Text style={styles.title}>Monthly Summary</Text>
          {onPress && (
            // @ts-expect-error react-native-vector-icons types incompatible with @types/react@19
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
        <View style={styles.yearNav}>
          <TouchableOpacity
            onPress={() => setYear((y) => y - 1)}
            style={styles.yearArrow}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Previous year"
          >
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="chevron-left" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.yearText}>{year}</Text>
          <TouchableOpacity
            onPress={() => setYear((y) => y + 1)}
            style={styles.yearArrow}
            disabled={year >= currentYear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Next year"
          >
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon
              name="chevron-right"
              size={20}
              color={year >= currentYear ? colors.textDisabled : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Summary Tiles ── */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryItem, { backgroundColor: INCOME_BG }]}>
          <Text style={[styles.summaryValue, { color: INCOME_COLOR }]}>
            {formatCurrency(totalIncome)}
          </Text>
          <Text style={styles.summaryLabel}>Income</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: EXPENSE_BG }]}>
          <Text style={[styles.summaryValue, { color: EXPENSE_COLOR }]}>
            {formatCurrency(totalExpense)}
          </Text>
          <Text style={styles.summaryLabel}>Expense</Text>
        </View>
        <View
          style={[
            styles.summaryItem,
            { backgroundColor: isProfit ? INCOME_BG : EXPENSE_BG },
          ]}
        >
          <Text
            style={[styles.summaryValue, { color: isProfit ? INCOME_COLOR : EXPENSE_COLOR }]}
          >
            {formatCurrency(Math.abs(netAmount))}
          </Text>
          <Text style={styles.summaryLabel}>{isProfit ? 'Profit' : 'Loss'}</Text>
        </View>
      </View>

      {/* ── Tooltip for selected month ── */}
      {selected != null && selectedMonth != null && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTitle}>{MONTH_LABELS[selectedMonth]} {year}</Text>
          <View style={styles.tooltipRow}>
            <View style={[styles.tooltipDot, { backgroundColor: INCOME_COLOR }]} />
            <Text style={styles.tooltipLabel}>Income:</Text>
            <Text style={[styles.tooltipValue, { color: INCOME_COLOR }]}>
              {formatCurrencyFull(selected.income)}
            </Text>
          </View>
          <View style={styles.tooltipRow}>
            <View style={[styles.tooltipDot, { backgroundColor: EXPENSE_COLOR }]} />
            <Text style={styles.tooltipLabel}>Expense:</Text>
            <Text style={[styles.tooltipValue, { color: EXPENSE_COLOR }]}>
              {formatCurrencyFull(selected.expense)}
            </Text>
          </View>
          {selected.income - selected.expense !== 0 && (
            <View style={styles.tooltipRow}>
              <View
                style={[
                  styles.tooltipDot,
                  {
                    backgroundColor:
                      selected.income >= selected.expense ? INCOME_COLOR : EXPENSE_COLOR,
                  },
                ]}
              />
              <Text style={styles.tooltipLabel}>Net:</Text>
              <Text
                style={[
                  styles.tooltipValue,
                  {
                    color: selected.income >= selected.expense ? INCOME_COLOR : EXPENSE_COLOR,
                  },
                ]}
              >
                {selected.income >= selected.expense ? '+' : '-'}
                {formatCurrencyFull(Math.abs(selected.income - selected.expense))}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Legend ── */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: INCOME_COLOR }]} />
          <Text style={styles.legendText}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: EXPENSE_COLOR }]} />
          <Text style={styles.legendText}>Expense</Text>
        </View>
      </View>

      {/* ── Chart with gridlines ── */}
      <View style={styles.chartContainer}>
        {/* Gridlines */}
        <View style={styles.gridlines}>
          {gridValues.reverse().map((val) => (
            <View key={val} style={styles.gridlineRow}>
              <Text style={styles.gridlineLabel}>{formatCurrency(val)}</Text>
              <View style={styles.gridline} />
            </View>
          ))}
        </View>

        {/* Bars */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chartScroll}
          contentContainerStyle={styles.chartScrollContent}
        >
          <View style={styles.chart}>
            {data.map((point, i) => {
              const incomeHeight =
                maxValue > 0 ? (point.income / maxValue) * BAR_MAX_HEIGHT : 0;
              const expenseHeight =
                maxValue > 0 ? (point.expense / maxValue) * BAR_MAX_HEIGHT : 0;
              const isCurrent = isCurrentYear && i === currentMonth;
              const isSelected = selectedMonth === i;
              const hasData = point.income > 0 || point.expense > 0;

              return (
                <Pressable
                  key={point.month}
                  style={[
                    styles.barGroup,
                    isSelected && styles.barGroupSelected,
                    isCurrent && styles.barGroupCurrent,
                  ]}
                  onPress={() => {
                    if (hasData) {
                      setSelectedMonth(isSelected ? null : i);
                    }
                  }}
                  accessibilityLabel={`${MONTH_LABELS[i]}: Income ${formatCurrencyFull(point.income)}, Expense ${formatCurrencyFull(point.expense)}`}
                  testID={`bar-${MONTH_SHORT[i]}`}
                >
                  <View style={styles.bars}>
                    <View
                      style={[
                        styles.bar,
                        styles.incomeBar,
                        { height: Math.max(incomeHeight, 2) },
                      ]}
                    />
                    <View
                      style={[
                        styles.bar,
                        styles.expenseBar,
                        { height: Math.max(expenseHeight, 2) },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.monthLabel,
                      isCurrent && styles.monthLabelCurrent,
                      isSelected && styles.monthLabelSelected,
                    ]}
                  >
                    {MONTH_SHORT[i]}
                  </Text>
                  {isCurrent && <View style={styles.currentDot} />}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
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

  /* ── Header ─────────────────────────────────────── */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  yearNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  yearArrow: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.text,
    minWidth: 44,
    textAlign: 'center',
  },

  /* ── Summary ────────────────────────────────────── */
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryItem: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  summaryLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: fontWeights.medium,
  },

  /* ── Tooltip ────────────────────────────────────── */
  tooltip: {
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  tooltipTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  tooltipLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  tooltipValue: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },

  /* ── Legend ─────────────────────────────────────── */
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },

  /* ── Chart ──────────────────────────────────────── */
  chartContainer: {
    position: 'relative',
  },
  gridlines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BAR_MAX_HEIGHT,
    justifyContent: 'space-between',
    zIndex: 0,
  },
  gridlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridlineLabel: {
    fontSize: 9,
    color: colors.textDisabled,
    width: 36,
    textAlign: 'right',
    marginRight: spacing.xs,
  },
  gridline: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  chartScroll: {
    marginLeft: 40,
  },
  chartScrollContent: {
    paddingRight: spacing.md,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_MAX_HEIGHT + 28,
    paddingTop: spacing.xs,
  },
  barGroup: {
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: spacing.xs,
    paddingBottom: 2,
    borderRadius: radius.sm,
    width: 30,
  },
  barGroupSelected: {
    backgroundColor: colors.primarySoft,
  },
  barGroupCurrent: {
    backgroundColor: colors.bgSubtle,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  incomeBar: {
    backgroundColor: INCOME_COLOR,
  },
  expenseBar: {
    backgroundColor: EXPENSE_COLOR,
  },
  monthLabel: {
    fontSize: 10,
    color: colors.textDisabled,
    marginTop: 4,
    fontWeight: fontWeights.medium,
  },
  monthLabelCurrent: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
  monthLabelSelected: {
    color: colors.text,
    fontWeight: fontWeights.bold,
  },
  currentDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
});
