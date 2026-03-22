import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import { getOwnerDashboard } from '../../../infra/dashboard/dashboard-api';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

function getMonthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function formatCurrency(n: number): string {
  if (n < 0) return `-\u20B9${Math.abs(n).toLocaleString('en-IN')}`;
  return `\u20B9${n.toLocaleString('en-IN')}`;
}

type FinancialData = {
  collected: number;
  pending: number;
  expenses: number;
};

function MetricTile({
  icon,
  label,
  amount,
  maxAmount,
  onPress,
}: {
  icon: string;
  label: string;
  amount: number;
  maxAmount: number;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pct = maxAmount > 0 ? Math.round((amount / maxAmount) * 100) : 0;

  return (
    <TouchableOpacity style={styles.metricTile} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <View style={styles.metricIconCircle}>
        
        <AppIcon name={icon} size={14} color={colors.primary} />
      </View>
      <Text style={styles.metricAmount}>{formatCurrency(amount)}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricBar}>
        <View
          style={[
            styles.metricBarFill,
            { width: `${pct}%` as any },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

type FinancialOverviewWidgetProps = {
  onCollectedPress?: () => void;
  onPendingPress?: () => void;
  onExpensesPress?: () => void;
  initialData?: { collected: number; pending: number; expenses: number } | null;
};

export function FinancialOverviewWidget({ onCollectedPress, onPendingPress, onExpensesPress, initialData }: FinancialOverviewWidgetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [initDate] = useState(() => new Date());
  const [year, setYear] = useState(initDate.getFullYear());
  const [month, setMonth] = useState(initDate.getMonth() + 1);
  const [data, setData] = useState<FinancialData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const mountedRef = useRef(true);

  // When initialData arrives and we're on the current month, use it directly
  const initialUsedRef = useRef(false);
  useEffect(() => {
    if (initialData && !initialUsedRef.current) {
      const isCurrent = year === initDate.getFullYear() && month === initDate.getMonth() + 1;
      if (isCurrent) {
        setData(initialData);
        setLoading(false);
        initialUsedRef.current = true;
      }
    }
  }, [initialData, year, month, initDate]);

  const load = useCallback(async () => {
    // Skip fetch for current month if initialData was used
    const isCurrent = year === new Date().getFullYear() && month === new Date().getMonth() + 1;
    if (isCurrent && initialUsedRef.current) {
      return;
    }

    setLoading(true);
    const { from, to } = getMonthRange(year, month);
    const result = await getOwnerDashboard({ mode: 'custom', from, to });
    if (!mountedRef.current) return;
    if (result.ok) {
      setData({
        collected: result.value.totalCollected,
        pending: result.value.totalPendingAmount,
        expenses: result.value.totalExpenses,
      });
    }
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const goBack = () => {
    initialUsedRef.current = false;
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
    if (
      nextYear > n.getFullYear() ||
      (nextYear === n.getFullYear() && nextMonth > n.getMonth() + 1)
    ) {
      return;
    }
    initialUsedRef.current = false;
    setYear(nextYear);
    setMonth(nextMonth);
  };

  const netProfit = data ? data.collected - data.expenses : 0;
  const maxAmount = data
    ? Math.max(data.collected, data.pending, data.expenses, 1)
    : 1;
  const profitPct =
    data && data.collected > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((data.collected - data.expenses) / data.collected) * 100,
            ),
          ),
        )
      : 0;

  return (
    <View style={styles.container} testID="financial-overview-widget">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          
          <AppIcon name="currency-inr" size={20} color={colors.primary} />
          <Text style={styles.title}>Financial Overview</Text>
        </View>
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.navBtn}
            accessibilityLabel="Previous month"
            accessibilityRole="button"
            testID="financial-month-back"
          >
            
            <AppIcon name="chevron-left" size={20} color={colors.textLight} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{getMonthLabel(year, month)}</Text>
          <TouchableOpacity
            onPress={goForward}
            style={styles.navBtn}
            accessibilityLabel="Next month"
            accessibilityRole="button"
            testID="financial-month-forward"
          >
            
            <AppIcon name="chevron-right" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.placeholder}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : data ? (
        <>
          {/* Net Profit highlight */}
          <View style={styles.profitCard}>
            <View style={styles.profitHeader}>
              <Text style={styles.profitLabel}>{netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</Text>
              <View style={[styles.profitIconCircle, { backgroundColor: netProfit >= 0 ? colors.successBg : colors.dangerBg }]}>
                <AppIcon
                  name={netProfit >= 0 ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={netProfit >= 0 ? colors.success : colors.danger}
                />
              </View>
            </View>
            <Text style={[styles.profitValue, { color: netProfit >= 0 ? colors.success : colors.danger }]}>{formatCurrency(netProfit)}</Text>
            <View style={styles.profitBar}>
              <View
                style={[
                  styles.profitBarFill,
                  { width: `${profitPct}%` as any },
                ]}
              />
            </View>
          </View>

          {/* Three metric tiles */}
          <View style={styles.metricsRow}>
            <MetricTile
              icon="cash-check"
              label="Collected"
              amount={data.collected}
              maxAmount={maxAmount}
              onPress={onCollectedPress}
            />
            <MetricTile
              icon="clock-outline"
              label="Pending"
              amount={data.pending}
              maxAmount={maxAmount}
              onPress={onPendingPress}
            />
            <MetricTile
              icon="cash-minus"
              label="Expenses"
              amount={data.expenses}
              maxAmount={maxAmount}
              onPress={onExpensesPress}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
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
  placeholder: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Net Profit */
  profitCard: {
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  profitLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  profitIconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  profitValue: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  profitBar: {
    height: 6,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  profitBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },

  /* Metric tiles */
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricTile: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  metricIconCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  metricAmount: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  metricBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
});
