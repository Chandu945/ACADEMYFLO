import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { ReceiptInfo } from '../../../domain/parent/parent.types';
import { getReceiptUseCase } from '../../../application/parent/use-cases/get-receipt.usecase';
import { parentApi } from '../../../infra/parent/parent-api';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

type ReceiptRouteParams = {
  Receipt: { feeDueId: string };
};

export function ReceiptScreen() {
  const route = useRoute<RouteProp<ReceiptRouteParams, 'Receipt'>>();
  const { feeDueId } = route.params;

  const [receipt, setReceipt] = useState<ReceiptInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getReceiptUseCase({ parentApi }, feeDueId);
    if (result.ok) {
      setReceipt(result.value);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }, [feeDueId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading receipt...</Text>
      </View>
    );
  }

  if (error || !receipt) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Receipt not found'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.receiptTitle}>Payment Receipt</Text>

        <View style={styles.receiptNumber}>
          <Text style={styles.receiptNumberText}>#{receipt.receiptNumber}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Student</Text>
          <Text style={styles.value}>{receipt.studentName}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Academy</Text>
          <Text style={styles.value}>{receipt.academyName}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Month</Text>
          <Text style={styles.value}>{receipt.monthKey}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.amountValue}>₹{receipt.amount}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Paid On</Text>
          <Text style={styles.value}>
            {new Date(receipt.paidAt).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Payment Method</Text>
          <Text style={styles.value}>{receipt.paymentMethod}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.danger, fontSize: fontSizes.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  receiptTitle: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  receiptNumber: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  receiptNumberText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  value: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  amountValue: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.success,
  },
});
