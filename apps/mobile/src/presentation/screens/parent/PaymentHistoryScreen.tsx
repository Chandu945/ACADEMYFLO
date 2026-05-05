import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { AppIcon } from '../../components/ui/AppIcon';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import type { ParentPaymentsStackParamList } from '../../navigation/ParentPaymentsStack';
import { getPaymentHistoryUseCase } from '../../../application/parent/use-cases/get-payment-history.usecase';
import { parentApi } from '../../../infra/parent/parent-api';
import type { PaymentHistoryItem } from '../../../domain/parent/parent.types';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { formatMonthShort, formatCurrency, formatDate } from '../../utils/format';
import { useTheme } from '../../context/ThemeContext';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';

function getSourceConfig(source: string, colors: Colors) {
  switch (source) {
    case 'PARENT_ONLINE':
      return { label: 'Online', icon: 'cellphone', color: colors.text, bg: colors.primarySoft };
    case 'OWNER_DIRECT':
      return { label: 'Cash', icon: 'cash', color: colors.success, bg: colors.successBg };
    case 'STAFF_APPROVED':
      return { label: 'Staff', icon: 'account-check', color: colors.warning, bg: colors.warningBg };
    case 'MANUAL':
      return { label: 'Manual', icon: 'hand-coin', color: colors.textSecondary, bg: colors.bgSubtle };
    default:
      return { label: source, icon: 'help-circle-outline', color: colors.textSecondary, bg: colors.bgSubtle };
  }
}

export function PaymentHistoryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp<ParentPaymentsStackParamList>>();
  const [items, setItems] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await getPaymentHistoryUseCase({ parentApi });
      if (!mountedRef.current) return;
      if (result.ok) {
        setItems(result.value);
      } else {
        setError(result.error.message);
      }
    } catch (e) {
      if (__DEV__) console.error('[PaymentHistoryScreen] Load failed:', e);
      if (mountedRef.current) {
        setError('Failed to load payment history.');
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
    return () => { mountedRef.current = false; };
  }, [load]);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } catch {
      // Handled inside load
    }
  }, [load]);

  const totalPaid = items.reduce((sum, item) => sum + item.amount, 0);

  const handleViewReceipt = useCallback(
    (feeDueId: string) => {
      navigation.navigate('Receipt', { feeDueId });
    },
    [navigation],
  );

  const keyExtractor = useCallback((item: PaymentHistoryItem) => item.receiptNumber, []);

  const renderItem = useCallback(({ item }: { item: PaymentHistoryItem }) => {
    const src = getSourceConfig(item.source, colors);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => handleViewReceipt(item.feeDueId)}
      >
        <InitialsAvatar name={item.studentName} size={40} />
        <View style={styles.cardInfo}>
          <View style={styles.cardTopRow}>
            <Text style={styles.studentName} numberOfLines={1}>
              {item.studentName}
            </Text>
            <View style={[styles.sourceBadge, { backgroundColor: src.bg }]}>
              <AppIcon name={src.icon} size={10} color={src.color} />
              <Text style={[styles.sourceText, { color: src.color }]}>{src.label}</Text>
            </View>
          </View>
          <Text style={styles.metaLine} numberOfLines={1}>
            {formatMonthShort(item.monthKey)}
            <Text style={styles.metaDot}> {'·'} </Text>
            {item.receiptNumber}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
          <Text style={styles.dateText}>{formatDate(item.paidAt)}</Text>
        </View>
        <AppIcon
          name="chevron-right"
          size={18}
          color={colors.textDisabled}
          style={styles.chevron}
        />
      </TouchableOpacity>
    );
  }, [colors, styles, handleViewReceipt]);

  if (loading) {
    return (
      <View style={styles.skeletons}>
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        
        <AppIcon name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
      }
      ListHeaderComponent={
        items.length > 0 ? (
          <View style={styles.summaryCard}>
            <LinearGradient
              colors={[gradient.start, gradient.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.summaryIconCircle}>
              <AppIcon name="check-decagram" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryLabel}>Total paid</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalPaid)}</Text>
              <Text style={styles.summarySubtitle}>
                across {items.length} {items.length === 1 ? 'receipt' : 'receipts'}
              </Text>
            </View>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          
          <AppIcon name="receipt" size={64} color={colors.textDisabled} />
          <Text style={styles.emptyTitle}>No Payments Yet</Text>
          <Text style={styles.emptySubtitle}>
            Your payment history will appear here once you make a payment
          </Text>
        </View>
      }
    />
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  list: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  skeletons: { padding: spacing.base },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  summaryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginRight: spacing.md,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.78)',
    fontWeight: fontWeights.medium,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    marginTop: 2,
    lineHeight: fontSizes['3xl'] + 4,
  },
  summarySubtitle: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  studentName: {
    flexShrink: 1,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  metaLine: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metaDot: {
    color: colors.textDisabled,
  },
  cardRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  amount: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.text,
    fontVariant: ['tabular-nums'] as const,
  },
  dateText: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    marginTop: 2,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  chevron: {
    marginLeft: spacing.xs,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSizes.md,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.base,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md,
  },
  retryText: {
    color: colors.text,
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.base,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
  },
  emptyTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginTop: spacing.base,
  },
  emptySubtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    maxWidth: 260,
  },
});
