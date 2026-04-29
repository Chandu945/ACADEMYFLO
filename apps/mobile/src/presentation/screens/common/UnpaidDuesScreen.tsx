import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, SafeAreaView, StyleSheet } from 'react-native';
import type { FeeDueItem } from '../../../domain/fees/fees.types';
import type { AppError } from '../../../domain/common/errors';
import { ownerMarkPaidUseCase } from '../../../application/fees/use-cases/owner-mark-paid.usecase';
import { markFeePaid } from '../../../infra/fees/fees-api';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmSheet } from '../../components/ui/ConfirmSheet';
import { FeeDueRow } from '../../components/fees/FeeDueRow';
import { spacing, fontSizes, fontWeights, listDefaults } from '../../theme';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';

type UnpaidDuesScreenProps = {
  items: FeeDueItem[];
  loading: boolean;
  error: AppError | null;
  onRetry: () => void;
  onRowPress: (studentId: string) => void;
  month: string;
  onMarkPaidSuccess: () => void;
  studentNameMap: Record<string, string>;
  loadingMore?: boolean;
  onEndReached?: () => void;
  total?: number;
  /** Number of skeleton tiles to render while loading. Default 5. */
  skeletonCount?: number;
};

const markPaidApi = { markFeePaid };

export function UnpaidDuesScreen({
  items,
  loading,
  error,
  onRetry,
  onRowPress,
  month,
  onMarkPaidSuccess,
  studentNameMap,
  loadingMore,
  onEndReached,
  total,
  skeletonCount = 5,
}: UnpaidDuesScreenProps) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [confirmItem, setConfirmItem] = useState<FeeDueItem | null>(null);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Optimistic hide: the id of an item currently being marked paid, filtered
  // from the visible list so the user gets instant feedback. Cleared when
  // the parent refetch replaces `items` (success) or explicitly on error.
  const [pendingPaidId, setPendingPaidId] = useState<string | null>(null);

  // Clearing when `items` ref changes is a reasonable proxy for "refetch
  // completed" — parent only hands us a new array after a list mutation.
  useEffect(() => {
    setPendingPaidId(null);
  }, [items]);

  const visibleItems = useMemo(
    () => (pendingPaidId ? items.filter((i) => i.id !== pendingPaidId) : items),
    [items, pendingPaidId],
  );

  // On react-native-web, FlatList can treat the list as "at end" the moment
  // it renders if content fits within the viewport, firing onEndReached on
  // every render. Require a real user scroll before we allow auto-pagination.
  const userScrolledRef = useRef(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Re-arm the scroll gate so auto-pagination stays disabled until the user
    // scrolls the refreshed list — otherwise onEndReached can fire immediately
    // after refresh completes while the list is still short.
    userScrolledRef.current = false;
    try {
      await onRetry();
    } catch {
      // Error handled by parent hook
    } finally {
      setRefreshing(false);
    }
  }, [onRetry]);

  const handleMarkPaid = useCallback(async () => {
    if (!confirmItem) return;
    const itemId = confirmItem.id;
    setMarking(true);
    setMarkError(null);
    setPendingPaidId(itemId);

    try {
      const result = await ownerMarkPaidUseCase(
        { feesApi: markPaidApi },
        confirmItem.studentId,
        confirmItem.monthKey,
      );

      if (result.ok) {
        setConfirmItem(null);
        onMarkPaidSuccess();
        showToast('Fee marked as paid');
      } else {
        setPendingPaidId(null);
        setMarkError(result.error.message);
      }
    } catch (e) {
      if (__DEV__) console.error('[UnpaidDuesScreen] Mark paid failed:', e);
      setPendingPaidId(null);
      setMarkError('Something went wrong. Please try again.');
    } finally {
      setMarking(false);
    }
  }, [confirmItem, onMarkPaidSuccess, showToast]);

  const renderItem = useCallback(
    ({ item }: { item: FeeDueItem }) => {
      const name = studentNameMap[item.studentId];
      return (
        <FeeDueRow
          item={item}
          onPress={() => onRowPress(item.studentId)}
          showStudentName
          studentName={name}
        />
      );
    },
    [onRowPress, studentNameMap],
  );

  const keyExtractor = useCallback((item: FeeDueItem) => item.id, []);

  const handleScrollBeginDrag = useCallback(() => {
    userScrolledRef.current = true;
  }, []);
  // onScrollBeginDrag only fires on touch drags. On react-native-web a mouse
  // wheel scroll bypasses it, which kept the gate closed and blocked page 2
  // from ever loading. onScroll fires for every scroll source (wheel, touch,
  // trackpad, programmatic), so we trip the gate once real movement happens.
  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    if (!userScrolledRef.current && e.nativeEvent.contentOffset.y > 4) {
      userScrolledRef.current = true;
    }
  }, []);
  const handleEndReached = useCallback(() => {
    if (userScrolledRef.current && onEndReached) onEndReached();
  }, [onEndReached]);

  if (loading) {
    return (
      <View style={styles.content} testID="skeleton-container">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <SkeletonTile key={i} />
        ))}
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

  // The header makes the dashboard ↔ list relationship obvious. Without it,
  // a user seeing page 1 (20 rows) can't tell it matches the "39 Due" KPI.
  const shownCount = visibleItems.length;
  const headerTotal = total ?? shownCount;
  const allLoaded = shownCount >= headerTotal && headerTotal > 0;

  return (
    <SafeAreaView style={styles.container}>
      {visibleItems.length === 0 ? (
        <EmptyState message="No unpaid dues for this month" />
      ) : (
        <FlatList
          data={visibleItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          extraData={studentNameMap}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onScrollBeginDrag={handleScrollBeginDrag}
          removeClippedSubviews
          windowSize={11}
          maxToRenderPerBatch={5}
          ListHeaderComponent={
            headerTotal > 0 ? (
              <View style={styles.countHeader} testID="unpaid-count-header">
                <Text style={[styles.countHeaderText, { color: colors.textSecondary }]}>
                  {allLoaded
                    ? `${headerTotal} unpaid`
                    : `Showing ${shownCount} of ${headerTotal} unpaid`}
                </Text>
                {!allLoaded && (
                  <Text style={[styles.countHeaderHint, { color: colors.textDisabled }]}>
                    Scroll for more
                  </Text>
                )}
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : allLoaded && shownCount > 5 ? (
              <View style={styles.footer}>
                <Text style={[styles.endOfList, { color: colors.textDisabled }]}>
                  End of list
                </Text>
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
    </SafeAreaView>
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
  countHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingBottom: spacing.sm,
  },
  countHeaderText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  countHeaderHint: {
    fontSize: 10,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  endOfList: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
});
