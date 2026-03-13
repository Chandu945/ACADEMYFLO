import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  FlatList,
  Text,
  StyleSheet,
} from 'react-native';
import { useReports } from '../../../application/reports/use-reports';
import {
  getMonthlyRevenue,
  getStudentWiseDues,
  getRevenueExportUrl,
  getPendingDuesExportUrl,
} from '../../../infra/reports/reports-api';
import { pdfDownload } from '../../../infra/reports/pdf-download';
import { exportRevenuePdfUseCase } from '../../../application/reports/use-cases/export-revenue-pdf.usecase';
import { exportPendingDuesPdfUseCase } from '../../../application/reports/use-cases/export-pending-dues-pdf.usecase';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { MonthPickerRow } from '../../components/fees/MonthPickerRow';
import { KpiTile } from '../../components/dashboard/KpiTile';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import { ExportButton } from '../../components/reports/ExportButton';
import type { StudentWiseDueItem } from '../../../domain/reports/reports.types';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const reportsApiRef = { getMonthlyRevenue, getStudentWiseDues };

function addMonths(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1 + delta, 1);
  const ny = d.getFullYear();
  const nm = String(d.getMonth() + 1).padStart(2, '0');
  return `${ny}-${nm}`;
}

const SEGMENTS = ['Revenue', 'Pending Dues'];

export function ReportsHomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { month, setMonth, revenue, pendingDues, loading, error, refetch } =
    useReports(reportsApiRef);
  const [selectedSegment, setSelectedSegment] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const goToPrev = useCallback(() => {
    setMonth(addMonths(month, -1));
  }, [month, setMonth]);

  const goToNext = useCallback(() => {
    setMonth(addMonths(month, 1));
  }, [month, setMonth]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleExportRevenue = useCallback(() => {
    return exportRevenuePdfUseCase(
      { pdfDownload, getExportUrl: getRevenueExportUrl },
      month,
    );
  }, [month]);

  const handleExportDues = useCallback(() => {
    return exportPendingDuesPdfUseCase(
      { pdfDownload, getExportUrl: getPendingDuesExportUrl },
      month,
    );
  }, [month]);

  const renderDueItem = useCallback(
    ({ item }: { item: StudentWiseDueItem }) => (
      <View style={styles.dueRow} testID={`due-row-${item.studentId}`}>
        <View style={styles.dueInfo}>
          <Text style={styles.dueName} numberOfLines={1}>
            {item.studentName}
          </Text>
          <Text style={styles.dueStatus}>{item.status}</Text>
        </View>
        <View style={styles.dueAmounts}>
          <Text style={styles.dueAmount}>{`\u20B9${item.amount}`}</Text>
          <Text style={styles.duePending}>
            {item.pendingMonthsCount} month{item.pendingMonthsCount !== 1 ? 's' : ''} pending
          </Text>
        </View>
      </View>
    ),
    [],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <SectionHeader title="Reports" />
        <MonthPickerRow month={month} onPrevious={goToPrev} onNext={goToNext} />
        <SegmentedControl
          segments={SEGMENTS}
          selectedIndex={selectedSegment}
          onSelect={setSelectedSegment}
          testID="reports-segments"
        />
      </View>

      {error && <InlineError message={error.message} onRetry={refetch} />}

      {loading && !refreshing ? (
        <View style={styles.skeletonContainer} testID="skeleton-container">
          <View style={styles.row}>
            <SkeletonTile />
            <SkeletonTile />
          </View>
          <View style={styles.row}>
            <SkeletonTile />
          </View>
        </View>
      ) : selectedSegment === 0 ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          testID="revenue-scroll"
        >
          {revenue ? (
            <View testID="revenue-container">
              <View style={styles.row}>
                <KpiTile label="Total Revenue" value={revenue.totalAmount} format="currency" />
                <KpiTile label="Transactions" value={revenue.transactionCount} />
              </View>

              {revenue.transactions.length === 0 ? (
                <EmptyState message="No transactions for this month" />
              ) : (
                revenue.transactions.map((tx) => (
                  <View key={tx.id} style={styles.txRow} testID={`tx-row-${tx.id}`}>
                    <View style={styles.txInfo}>
                      <Text style={styles.txReceipt}>{tx.receiptNumber}</Text>
                      <Text style={styles.txSource}>{tx.source}</Text>
                    </View>
                    <Text style={styles.txAmount}>{`\u20B9${tx.amount}`}</Text>
                  </View>
                ))
              )}

              <View style={styles.exportRow}>
                <ExportButton
                  onExport={handleExportRevenue}
                  testID="export-revenue-pdf"
                />
              </View>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <View style={styles.duesContainer}>
          <FlatList
            data={pendingDues}
            keyExtractor={(item) => `${item.studentId}-${item.monthKey}`}
            renderItem={renderDueItem}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
            ListEmptyComponent={<EmptyState message="No pending dues for this month" />}
            testID="dues-list"
          />
          {pendingDues.length > 0 && (
            <View style={styles.exportRow}>
              <ExportButton
                onExport={handleExportDues}
                testID="export-dues-pdf"
              />
            </View>
          )}
        </View>
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
    padding: spacing.base,
    paddingBottom: 0,
  },
  skeletonContainer: {
    padding: spacing.base,
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  scrollContent: {
    padding: spacing.base,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: spacing.sm,
  },
  txInfo: {
    flex: 1,
  },
  txReceipt: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  txSource: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  txAmount: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.success,
  },
  duesContainer: {
    flex: 1,
  },
  listContent: {
    padding: spacing.base,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: spacing.sm,
  },
  dueInfo: {
    flex: 1,
  },
  dueName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  dueStatus: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  dueAmounts: {
    alignItems: 'flex-end',
  },
  dueAmount: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.danger,
  },
  duePending: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    marginTop: 2,
  },
  exportRow: {
    padding: spacing.base,
    paddingTop: spacing.sm,
  },
});
