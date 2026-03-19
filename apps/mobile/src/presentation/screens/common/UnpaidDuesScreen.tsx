import React, { useState, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import type { FeeDueItem } from '../../../domain/fees/fees.types';
import type { AppError } from '../../../domain/common/errors';
import { ownerMarkPaidUseCase } from '../../../application/fees/use-cases/owner-mark-paid.usecase';
import { markFeePaid } from '../../../infra/fees/fees-api';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmSheet } from '../../components/ui/ConfirmSheet';
import { FeeDueRow } from '../../components/fees/FeeDueRow';
import { spacing, listDefaults } from '../../theme';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';

type UnpaidDuesScreenProps = {
  items: FeeDueItem[];
  loading: boolean;
  error: AppError | null;
  onRetry: () => void;
  onRowPress: (studentId: string) => void;
  isOwner: boolean;
  month: string;
  onMarkPaidSuccess: () => void;
  studentNameMap: Record<string, string>;
  hasMore?: boolean;
  loadingMore?: boolean;
  onEndReached?: () => void;
  total?: number;
};

const markPaidApi = { markFeePaid };

export function UnpaidDuesScreen({
  items,
  loading,
  error,
  onRetry,
  onRowPress,
  isOwner,
  month,
  onMarkPaidSuccess,
  studentNameMap,
  hasMore: _hasMore,
  loadingMore,
  onEndReached,
}: UnpaidDuesScreenProps) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [confirmItem, setConfirmItem] = useState<FeeDueItem | null>(null);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRetry();
    setRefreshing(false);
  }, [onRetry]);

  const handleMarkPaid = useCallback(async () => {
    if (!confirmItem) return;
    setMarking(true);
    setMarkError(null);

    const result = await ownerMarkPaidUseCase(
      { feesApi: markPaidApi },
      confirmItem.studentId,
      confirmItem.monthKey,
    );

    setMarking(false);

    if (result.ok) {
      setConfirmItem(null);
      onMarkPaidSuccess();
      showToast('Fee marked as paid');
    } else {
      setMarkError(result.error.message);
    }
  }, [confirmItem, onMarkPaidSuccess, showToast]);

  const renderItem = useCallback(
    ({ item }: { item: FeeDueItem }) => {
      const name = studentNameMap[item.studentId];
      return (
        <FeeDueRow
          item={item}
          onPress={() => (isOwner ? setConfirmItem(item) : onRowPress(item.studentId))}
          showStudentName
          studentName={name}
        />
      );
    },
    [isOwner, onRowPress, studentNameMap],
  );

  const keyExtractor = useCallback((item: FeeDueItem) => item.id, []);

  if (loading) {
    return (
      <View style={styles.content} testID="skeleton-container">
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.content}>
        <InlineError message={error.message} onRetry={onRetry} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <EmptyState message="No unpaid dues for this month" />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          extraData={studentNameMap}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          testID="unpaid-list"
        />
      )}

      <ConfirmSheet
        visible={confirmItem !== null}
        title="Mark as Paid"
        message={markError ? markError : `Mark fee for ${confirmItem?.monthKey ?? month} as paid?`}
        confirmLabel="Mark Paid"
        onConfirm={handleMarkPaid}
        onCancel={() => {
          setConfirmItem(null);
          setMarkError(null);
        }}
        loading={marking}
        testID="mark-paid-confirm"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.base,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: listDefaults.contentPaddingBottomNoFab,
  },
  footer: {
    paddingVertical: spacing.md,
    alignItems: 'center' as const,
  },
});
