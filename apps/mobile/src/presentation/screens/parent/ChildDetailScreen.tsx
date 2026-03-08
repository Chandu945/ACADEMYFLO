import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParentHomeStackParamList } from '../../navigation/ParentHomeStack';
import type { ChildAttendanceSummary, ChildFeeDue } from '../../../domain/parent/parent.types';
import { getChildAttendanceUseCase } from '../../../application/parent/use-cases/get-child-attendance.usecase';
import { getChildFeesUseCase } from '../../../application/parent/use-cases/get-child-fees.usecase';
import { parentApi } from '../../../infra/parent/parent-api';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

type Route = RouteProp<ParentHomeStackParamList, 'ChildDetail'>;
type Nav = NativeStackNavigationProp<ParentHomeStackParamList, 'ChildDetail'>;

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthRange(): { from: string; to: string } {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const from = `${y}-${String(Math.max(1, m - 5)).padStart(2, '0')}`;
  const to = `${y}-${String(Math.min(12, m + 1)).padStart(2, '0')}`;
  return { from, to };
}

export function ChildDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { studentId, fullName } = route.params;

  const [attendance, setAttendance] = useState<ChildAttendanceSummary | null>(null);
  const [fees, setFees] = useState<ChildFeeDue[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const month = getCurrentMonth();
    const { from, to } = getMonthRange();

    const [attResult, feesResult] = await Promise.all([
      getChildAttendanceUseCase({ parentApi }, studentId, month),
      getChildFeesUseCase({ parentApi }, studentId, from, to),
    ]);

    if (attResult.ok) setAttendance(attResult.value);
    if (feesResult.ok) setFees(feesResult.value);
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Attendance — {getCurrentMonth()}</Text>
      {attendance && (
        <View style={styles.attendanceCard}>
          <View style={styles.attendanceRow}>
            <View style={styles.attendanceStat}>
              <Text style={styles.statValue}>{attendance.presentCount}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.attendanceStat}>
              <Text style={[styles.statValue, { color: colors.danger }]}>
                {attendance.absentCount}
              </Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={styles.attendanceStat}>
              <Text style={[styles.statValue, { color: colors.textSecondary }]}>
                {attendance.holidayCount}
              </Text>
              <Text style={styles.statLabel}>Holidays</Text>
            </View>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Fee History</Text>
      {fees.map((fee) => (
        <View key={fee.id} style={styles.feeCard}>
          <View style={styles.feeHeader}>
            <Text style={styles.feeMonth}>{fee.monthKey}</Text>
            <View
              style={[
                styles.feeBadge,
                {
                  backgroundColor:
                    fee.status === 'PAID'
                      ? colors.successBg
                      : fee.status === 'DUE'
                        ? colors.dangerBg
                        : colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.feeBadgeText,
                  {
                    color:
                      fee.status === 'PAID'
                        ? colors.successText
                        : fee.status === 'DUE'
                          ? colors.dangerText
                          : colors.textSecondary,
                  },
                ]}
              >
                {fee.status}
              </Text>
            </View>
          </View>
          <Text style={styles.feeAmount}>₹{fee.amount}</Text>
          {fee.status === 'PAID' && (
            <TouchableOpacity
              style={styles.receiptButton}
              onPress={() => {
                navigation.navigate('Receipt', { feeDueId: fee.id });
              }}
            >
              <Text style={styles.receiptButtonText}>View Receipt</Text>
            </TouchableOpacity>
          )}
          {fee.status === 'DUE' && (
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => {
                navigation.navigate('FeePayment', {
                  feeDueId: fee.id,
                  monthKey: fee.monthKey,
                  amount: fee.amount,
                });
              }}
            >
              <Text style={styles.payButtonText}>Pay Now</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {fees.length === 0 && (
        <Text style={styles.emptyText}>No fee records found</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  attendanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  attendanceRow: { flexDirection: 'row', justifyContent: 'space-around' },
  attendanceStat: { alignItems: 'center' },
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.success,
  },
  statLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  feeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  feeMonth: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  feeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  feeBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
  feeAmount: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  receiptButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderRadius: radius.sm,
  },
  receiptButtonText: {
    color: colors.successText,
    fontWeight: fontWeights.medium,
    fontSize: fontSizes.sm,
  },
  payButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  payButtonText: {
    color: '#fff',
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
