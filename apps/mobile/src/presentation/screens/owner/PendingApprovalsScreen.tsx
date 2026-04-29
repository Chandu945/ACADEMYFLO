import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  FlatList,
  TextInput,
  Text,
  SafeAreaView,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import type { AppError } from '../../../domain/common/errors';
import type { PaymentRequestItem } from '../../../domain/fees/payment-requests.types';
import { listPaymentRequestsUseCase } from '../../../application/fees/use-cases/list-payment-requests.usecase';
import { ownerApproveRequestUseCase } from '../../../application/fees/use-cases/owner-approve-request.usecase';
import { ownerRejectRequestUseCase } from '../../../application/fees/use-cases/owner-reject-request.usecase';
import {
  listPaymentRequests,
  approvePaymentRequest,
  rejectPaymentRequest,
} from '../../../infra/fees/payment-requests-api';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmSheet } from '../../components/ui/ConfirmSheet';
import { RequestRow } from '../../components/fees/RequestRow';
import { spacing, fontSizes, fontWeights, radius, listDefaults, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

type SourceFilter = 'ALL' | 'STAFF' | 'PARENT';

type PendingApprovalsScreenProps = {
  onActionComplete: () => void;
};

const requestsApi = { listPaymentRequests, approvePaymentRequest, rejectPaymentRequest };

export function PendingApprovalsScreen({ onActionComplete }: PendingApprovalsScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { showToast } = useToast();
  const [items, setItems] = useState<PaymentRequestItem[]>([]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [actionTarget, setActionTarget] = useState<{
    item: PaymentRequestItem;
    action: 'approve' | 'reject';
  } | null>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);

    try {
      const result = await listPaymentRequestsUseCase({ paymentRequestsApi: requestsApi }, 'PENDING');

      if (!mountedRef.current) return;

      if (result.ok) {
        setItems(result.value.items);
      } else {
        setError(result.error);
      }
    } catch (e) {
      if (__DEV__) console.error('[PendingApprovalsScreen] Load failed:', e);
      if (mountedRef.current) {
        setError({ code: 'UNKNOWN', message: 'Failed to load pending approvals.' });
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Refresh data each time screen regains focus (tab switch, navigation back)
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      load();
    }, [load]),
  );

  const handleAction = useCallback(async () => {
    if (!actionTarget) return;
    setActing(true);
    setActionError(null);

    try {
      let result;
      if (actionTarget.action === 'approve') {
        result = await ownerApproveRequestUseCase(
          { paymentRequestsApi: requestsApi },
          actionTarget.item.id,
        );
      } else {
        if (rejectionReason.trim().length < 3) {
          Alert.alert('Rejection Reason Required', 'Please provide a rejection reason (at least 3 characters).');
          setActing(false);
          return;
        }
        const reason = rejectionReason.trim();
        result = await ownerRejectRequestUseCase(
          { paymentRequestsApi: requestsApi },
          actionTarget.item.id,
          reason,
        );
      }

      if (!mountedRef.current) return;

      if (result.ok) {
        const wasApprove = actionTarget.action === 'approve';
        setActionTarget(null);
        setRejectionReason('');
        load();
        onActionComplete();
        showToast(wasApprove ? 'Request approved' : 'Request rejected');
      } else {
        setActionError(result.error.message);
      }
    } catch (e) {
      if (__DEV__) console.error('[PendingApprovalsScreen] Action failed:', e);
      if (mountedRef.current) {
        setActionError('Something went wrong. Please try again.');
      }
    } finally {
      if (mountedRef.current) setActing(false);
    }
  }, [actionTarget, rejectionReason, load, onActionComplete, showToast]);

  const renderItem = useCallback(
    ({ item }: { item: PaymentRequestItem }) => (
      <RequestRow
        item={item}
        onApprove={() => setActionTarget({ item, action: 'approve' })}
        onReject={() => setActionTarget({ item, action: 'reject' })}
      />
    ),
    [],
  );

  const keyExtractor = useCallback((item: PaymentRequestItem) => item.id, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  // Hooks must run on every render (Rules of Hooks). These have to live above
  // the loading/error early-returns below — otherwise the hook count changes
  // between renders and the whole screen crashes with "Rendered more hooks
  // than during the previous render."
  const counts = useMemo(
    () => ({
      ALL: items.length,
      STAFF: items.filter((i) => i.source !== 'PARENT').length,
      PARENT: items.filter((i) => i.source === 'PARENT').length,
    }),
    [items],
  );

  const filteredItems = useMemo(() => {
    if (sourceFilter === 'ALL') return items;
    if (sourceFilter === 'PARENT') return items.filter((i) => i.source === 'PARENT');
    return items.filter((i) => i.source !== 'PARENT');
  }, [items, sourceFilter]);

  if (loading && !refreshing) {
    return (
      <View style={styles.content} testID="skeleton-container">
        <SkeletonTile />
        <SkeletonTile />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.content}>
        <InlineError message={error.message} onRetry={load} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Source filter tabs — only render when there's at least one PARENT
          request so existing staff-only academies don't see noisy tabs. */}
      {counts.PARENT > 0 && (
        <View style={styles.filterTabs} testID="source-filter-tabs">
          {(['ALL', 'STAFF', 'PARENT'] as const).map((key) => {
            const active = sourceFilter === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterTab, active && styles.filterTabActive]}
                onPress={() => setSourceFilter(key)}
                testID={`source-tab-${key.toLowerCase()}`}
                activeOpacity={0.8}
              >
                {active ? (
                  <LinearGradient
                    colors={[gradient.start, gradient.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                  {key === 'ALL' ? 'All' : key === 'STAFF' ? 'Staff' : 'Parent'}
                </Text>
                <Text
                  style={[styles.filterTabCount, active && styles.filterTabCountActive]}
                >
                  {counts[key]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {filteredItems.length === 0 ? (
        <EmptyState
          message={
            sourceFilter === 'PARENT'
              ? 'No parent requests'
              : sourceFilter === 'STAFF'
                ? 'No staff requests'
                : 'No pending approvals'
          }
        />
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          testID="pending-approvals-list"
        />
      )}

      {actionTarget?.action === 'reject' && (
        <View style={styles.reasonContainer}>
          <Text style={styles.reasonLabel}>Rejection Reason</Text>
          <TextInput
            style={styles.reasonInput}
            value={rejectionReason}
            onChangeText={setRejectionReason}
            placeholder="Enter reason for rejection..."
            multiline
            numberOfLines={3}
            maxLength={300}
            accessibilityLabel="Reason for rejecting this payment request"
            placeholderTextColor={colors.textDisabled}
            testID="rejection-reason-input"
          />
        </View>
      )}

      <ConfirmSheet
        visible={actionTarget !== null}
        title={actionTarget?.action === 'approve' ? 'Approve Request' : 'Reject Request'}
        message={
          actionError
            ? actionError
            : actionTarget?.action === 'approve'
              ? `Approve payment request for ${actionTarget?.item.monthKey}?`
              : `Reject payment request for ${actionTarget?.item.monthKey}?`
        }
        confirmLabel={actionTarget?.action === 'approve' ? 'Approve' : 'Reject'}
        confirmVariant={actionTarget?.action === 'approve' ? 'primary' : 'danger'}
        onConfirm={handleAction}
        onCancel={() => {
          setActionTarget(null);
          setActionError(null);
          setRejectionReason('');
        }}
        loading={acting}
        testID="approval-confirm"
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
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
  reasonContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  reasonLabel: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top' as const,
    fontSize: fontSizes.base,
    color: colors.text,
    backgroundColor: colors.surface,
  },

  /* Source filter tabs */
  filterTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  filterTabActive: {
    borderColor: 'transparent',
  },
  filterTabText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterTabCount: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.textDisabled,
    backgroundColor: colors.bgSubtle,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    minWidth: 20,
    textAlign: 'center',
  },
  filterTabCountActive: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});
