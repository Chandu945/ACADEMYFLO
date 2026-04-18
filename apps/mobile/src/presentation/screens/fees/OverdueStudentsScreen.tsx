import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { AppIcon } from '../../components/ui/AppIcon';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { getOverdueStudents } from '../../../infra/fees/fees-api';
import type { OverdueStudentItem, OverdueStudentsResult } from '../../../domain/fees/overdue.types';

function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN')}`;
}

function getAvatarLetter(name: string): string {
  return (name.charAt(0) || '?').toUpperCase();
}

export function OverdueStudentsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [data, setData] = useState<OverdueStudentsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setError(null);
    const result = await getOverdueStudents();
    if (!mountedRef.current) return;
    if (result.ok) {
      setData(result.value);
    } else {
      setError(result.error.message);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetchData().finally(() => {
      if (mountedRef.current) setLoading(false);
    });
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } catch {
      // handled above
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, [fetchData]);

  const keyExtractor = useCallback((item: OverdueStudentItem) => item.studentId, []);

  const renderItem = useCallback(
    ({ item }: { item: OverdueStudentItem }) => (
      <View style={styles.studentCard} testID={`overdue-row-${item.studentId}`}>
        <View style={styles.studentRow}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getAvatarLetter(item.studentName)}</Text>
          </View>

          {/* Info */}
          <View style={styles.studentInfo}>
            <Text style={styles.studentName} numberOfLines={1}>{item.studentName}</Text>
            <Text style={styles.studentSubtitle}>
              {item.overdueMonths} {item.overdueMonths === 1 ? 'month' : 'months'} overdue
            </Text>
          </View>

          {/* Days badge */}
          <View style={styles.daysBadge}>
            <Text style={styles.daysBadgeText}>{item.daysOverdue} days</Text>
          </View>
        </View>

        {/* Amount breakdown */}
        <View style={styles.amountRow}>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Base</Text>
            <Text style={styles.amountValue}>{formatCurrency(item.totalBaseAmount)}</Text>
          </View>
          <Text style={styles.amountPlus}>+</Text>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Late Fee</Text>
            <Text style={[styles.amountValue, { color: colors.danger }]}>{formatCurrency(item.totalLateFee)}</Text>
          </View>
          <Text style={styles.amountEquals}>=</Text>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={[styles.amountValue, styles.amountTotal]}>{formatCurrency(item.totalPayable)}</Text>
          </View>
        </View>
      </View>
    ),
    [styles, colors],
  );

  const summaryHeader = useMemo(() => {
    if (!data) return null;
    return (
      <View style={styles.summaryCard} testID="overdue-summary">
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIconCircle, { backgroundColor: colors.warningLightBg }]}>
              <AppIcon name="currency-inr" size={18} color={colors.warning} />
            </View>
            <Text style={styles.summaryLabel}>Total Overdue</Text>
            <Text style={styles.summaryValue}>{formatCurrency(data.totalOverdueAmount)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIconCircle, { backgroundColor: colors.warningBg }]}>
              <AppIcon name="clock-alert-outline" size={18} color={colors.warning} />
            </View>
            <Text style={styles.summaryLabel}>Late Fees</Text>
            <Text style={styles.summaryValue}>{formatCurrency(data.totalLateFees)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIconCircle, { backgroundColor: colors.primarySoft }]}>
              <AppIcon name="account-group-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.summaryLabel}>Students</Text>
            <Text style={styles.summaryValue}>{data.items.length}</Text>
          </View>
        </View>
      </View>
    );
  }, [data, styles, colors]);

  if (loading && !refreshing) {
    return (
      <View style={styles.screen} testID="overdue-loading">
        <View style={styles.skeletonContainer}>
          <SkeletonTile />
          <SkeletonTile variant="row" />
          <SkeletonTile variant="row" />
          <SkeletonTile variant="row" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen} testID="overdue-students-screen">
      {error && (
        <View style={styles.errorCard} testID="overdue-error">
          <View style={styles.errorIconCircle}>
            <AppIcon name="alert-circle-outline" size={20} color={colors.danger} />
          </View>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={data?.items ?? []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={summaryHeader}
        ListEmptyComponent={
          <EmptyState
            message="No overdue students"
            subtitle="All students are up to date with their payments"
            icon="check-circle-outline"
          />
        }
        showsVerticalScrollIndicator={false}
        testID="overdue-list"
      />
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  skeletonContainer: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  errorIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.danger,
    fontWeight: fontWeights.medium,
  },

  /* Summary card */
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  summaryDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.border,
  },

  /* Student card */
  studentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  studentSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  daysBadge: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  daysBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.danger,
  },

  /* Amount breakdown */
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  amountTotal: {
    color: colors.primary,
  },
  amountPlus: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginHorizontal: spacing.xs,
  },
  amountEquals: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginHorizontal: spacing.xs,
  },
});
