import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MonthlyChartPoint } from '../../../domain/dashboard/dashboard.types';
import { getMonthlyChart } from '../../../infra/dashboard/dashboard-api';
import { colors, spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const BAR_MAX_HEIGHT = 100;

function formatCurrency(n: number): string {
  if (n >= 100000) return `\u20B9${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `\u20B9${(n / 1000).toFixed(1)}K`;
  return `\u20B9${n}`;
}

export function MonthlyChartWidget() {
  const [data, setData] = useState<MonthlyChartPoint[] | null>(null);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    const result = await getMonthlyChart(year);
    if (!mountedRef.current) return;
    if (result.ok) {
      setData(result.value.data);
    }
  }, [year]);

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

  return (
    <View style={styles.container} testID="monthly-chart-widget">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
          <Icon name="chart-bar" size={20} color={colors.primary} />
          <Text style={styles.title}>Monthly Summary ({year})</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryItem, { backgroundColor: '#ecfdf5' }]}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {formatCurrency(totalIncome)}
          </Text>
          <Text style={styles.summaryLabel}>Income</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: colors.dangerBg }]}>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>
            {formatCurrency(totalExpense)}
          </Text>
          <Text style={styles.summaryLabel}>Expense</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chart}>
          {data.map((point, i) => {
            const incomeHeight = maxValue > 0 ? (point.income / maxValue) * BAR_MAX_HEIGHT : 0;
            const expenseHeight = maxValue > 0 ? (point.expense / maxValue) * BAR_MAX_HEIGHT : 0;

            return (
              <View key={point.month} style={styles.barGroup}>
                <View style={styles.bars}>
                  <View
                    style={[
                      styles.bar,
                      { height: incomeHeight, backgroundColor: colors.success },
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      { height: expenseHeight, backgroundColor: '#ef4444' },
                    ]}
                  />
                </View>
                <Text style={styles.monthLabel}>{MONTH_LABELS[i]}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginTop: spacing.md,
    ...shadows.md,
  },
  header: {
    marginBottom: spacing.md,
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
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  summaryItem: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
  },
  summaryLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_MAX_HEIGHT + 24,
    paddingTop: spacing.xs,
  },
  barGroup: {
    alignItems: 'center',
    marginHorizontal: 4,
    width: 24,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 10,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    minHeight: 2,
  },
  monthLabel: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    marginTop: 4,
    fontWeight: fontWeights.medium,
  },
});
