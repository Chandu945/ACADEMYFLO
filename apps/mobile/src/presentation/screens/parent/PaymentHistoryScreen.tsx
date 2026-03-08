import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, RefreshControl, StyleSheet, Text } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { getPaymentHistoryUseCase } from '../../../application/parent/use-cases/get-payment-history.usecase';
import { parentApi } from '../../../infra/parent/parent-api';
import type { PaymentHistoryItem } from '../../../domain/parent/parent.types';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

function formatSource(source: string): string {
  switch (source) {
    case 'PARENT_ONLINE':
      return 'Online';
    case 'OWNER_DIRECT':
      return 'Cash';
    case 'STAFF_APPROVED':
      return 'Staff';
    default:
      return source;
  }
}

export function PaymentHistoryScreen() {
  const [items, setItems] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const result = await getPaymentHistoryUseCase({ parentApi });
    if (result.ok) {
      setItems(result.value);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const renderItem = useCallback(({ item }: { item: PaymentHistoryItem }) => {
    const date = new Date(item.paidAt);
    const dateStr = date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.studentName}>{item.studentName}</Text>
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceText}>{formatSource(item.source)}</Text>
          </View>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.monthText}>{item.monthKey}</Text>
          <Text style={styles.amount}>{'\u20B9'}{item.amount}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.receiptText}>#{item.receiptNumber}</Text>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>
      </View>
    );
  }, []);

  if (loading) {
    return (
      <Screen scroll={false}>
        <View style={styles.center}>
          <Text>Loading...</Text>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen scroll={false}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.receiptNumber}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>No payment history yet</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  studentName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  sourceBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  sourceText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.primary,
  },
  monthText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  amount: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  receiptText: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
  },
  dateText: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  errorText: { color: colors.danger, fontSize: fontSizes.md },
  emptyText: { color: colors.textSecondary, fontSize: fontSizes.md },
});
