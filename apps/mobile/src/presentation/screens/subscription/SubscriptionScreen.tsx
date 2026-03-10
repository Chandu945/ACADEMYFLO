import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PaymentStatusBanner } from '../../components/subscription/PaymentStatusBanner';
import { PayWithCashfreeButton } from '../../components/subscription/PayWithCashfreeButton';
import { usePaymentFlow } from '../../../application/subscription/use-payment-flow';
import type {
  TierPricing,
  PendingTierChange,
  TierKey,
} from '../../../domain/subscription/subscription.types';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type StatusVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

function statusVariant(status: string): StatusVariant {
  switch (status) {
    case 'ACTIVE_PAID':
      return 'success';
    case 'TRIAL':
      return 'info';
    case 'EXPIRED_GRACE':
      return 'warning';
    case 'BLOCKED':
    case 'DISABLED':
      return 'danger';
    default:
      return 'neutral';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE_PAID':
      return 'Active';
    case 'TRIAL':
      return 'Trial';
    case 'EXPIRED_GRACE':
      return 'Grace Period';
    case 'BLOCKED':
      return 'Blocked';
    case 'DISABLED':
      return 'Disabled';
    default:
      return status;
  }
}

function tierLabel(tierKey: TierKey | null): string {
  switch (tierKey) {
    case 'TIER_0_50':
      return '0\u201350 students';
    case 'TIER_51_100':
      return '51\u2013100 students';
    case 'TIER_101_PLUS':
      return '101+ students';
    default:
      return 'No tier';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function TierRow({ tier, isCurrent }: { tier: TierPricing; isCurrent: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View
      style={[styles.tierRow, isCurrent && styles.tierRowActive]}
      testID={`tier-row-${tier.tierKey}`}
    >
      <View style={styles.tierInfo}>
        <Text style={styles.tierRange}>
          {tier.min}\u2013{tier.max ?? '\u221E'} students
        </Text>
        {isCurrent ? <Badge label="Current" variant="info" /> : null}
      </View>
      <Text style={styles.tierPrice}>\u20B9{tier.priceInr}/mo</Text>
    </View>
  );
}

function UpgradeBanner({
  pendingChange,
  requiredTierKey,
  currentTierKey,
}: {
  pendingChange: PendingTierChange | null;
  requiredTierKey: TierKey;
  currentTierKey: TierKey | null;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (requiredTierKey === currentTierKey) return null;

  return (
    <View style={styles.upgradeBanner} testID="upgrade-banner">
      <Text style={styles.upgradeBannerTitle}>Tier Change Required</Text>
      <Text style={styles.upgradeBannerText}>
        Your active student count requires the {tierLabel(requiredTierKey)} tier.
      </Text>
      {pendingChange ? (
        <Text style={styles.upgradeBannerText}>
          Change to {tierLabel(pendingChange.tierKey)} effective{' '}
          {formatDate(pendingChange.effectiveAt)}.
        </Text>
      ) : null}
    </View>
  );
}

export function SubscriptionScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { subscription, logout, refreshSubscription, user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSubscription();
    setRefreshing(false);
  }, [refreshSubscription]);

  const paymentFlow = usePaymentFlow(handleRefresh);

  if (!subscription) {
    return (
      <Screen scroll={false}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading subscription...</Text>
        </View>
      </Screen>
    );
  }

  const isBlocked = !subscription.canAccessApp;

  const header = (
    <View>
      {/* Status Card */}
      <View style={styles.statusCard} testID="status-card">
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status</Text>
          <Badge
            label={statusLabel(subscription.status)}
            variant={statusVariant(subscription.status)}
            testID="status-badge"
          />
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Days Remaining</Text>
          <Text style={styles.statusValue}>{subscription.daysRemaining}</Text>
        </View>

        {subscription.trialEndAt ? (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Trial Ends</Text>
            <Text style={styles.statusValue}>{formatDate(subscription.trialEndAt)}</Text>
          </View>
        ) : null}

        {subscription.paidEndAt ? (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Paid Until</Text>
            <Text style={styles.statusValue}>{formatDate(subscription.paidEndAt)}</Text>
          </View>
        ) : null}

        {subscription.blockReason ? (
          <Text style={styles.blockReason}>{subscription.blockReason}</Text>
        ) : null}
      </View>

      {/* Tier Info */}
      <View style={styles.tierCard} testID="tier-card">
        <Text style={styles.cardTitle}>Tier Info</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Active Students</Text>
          <Text style={styles.statusValue} testID="active-student-count">
            {subscription.activeStudentCount}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Current Tier</Text>
          <Text style={styles.statusValue}>{tierLabel(subscription.currentTierKey)}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Required Tier</Text>
          <Text style={styles.statusValue}>{tierLabel(subscription.requiredTierKey)}</Text>
        </View>
      </View>

      {/* Upgrade Banner */}
      <UpgradeBanner
        pendingChange={subscription.pendingTierChange}
        requiredTierKey={subscription.requiredTierKey}
        currentTierKey={subscription.currentTierKey}
      />

      {/* Payment Status Banner */}
      <PaymentStatusBanner status={paymentFlow.status} error={paymentFlow.error} />

      {/* Pay CTA — show for Owner when not ACTIVE_PAID and not DISABLED */}
      {user?.role === 'OWNER' &&
        subscription.status !== 'ACTIVE_PAID' &&
        subscription.status !== 'DISABLED' && (
          <PayWithCashfreeButton
            status={paymentFlow.status}
            tierLabel={tierLabel(subscription.requiredTierKey)}
            amountInr={
              subscription.tiers.find((t) => t.tierKey === subscription.requiredTierKey)
                ?.priceInr ?? 299
            }
            onPress={paymentFlow.startPayment}
            onRetry={paymentFlow.reset}
          />
        )}

      {/* Pricing Table Header */}
      <Text style={styles.cardTitle}>Pricing</Text>
    </View>
  );

  return (
    <Screen scroll={false}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.listContent}
      >
        {header}
        {subscription.tiers.map((tier) => (
          <TierRow key={tier.tierKey} tier={tier} isCurrent={tier.tierKey === subscription.currentTierKey} />
        ))}
        <View style={styles.footer}>
          <Button
            title="Refresh Status"
            onPress={handleRefresh}
            loading={refreshing}
            testID="subscription-refresh"
          />
          {isBlocked ? (
            <>
              <View style={styles.spacer} />
              <Button
                title="Sign Out"
                variant="secondary"
                onPress={logout}
                testID="subscription-logout"
              />
            </>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.base,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tierCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textDark,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  statusLabel: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
  },
  statusValue: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  blockReason: {
    fontSize: fontSizes.sm,
    color: colors.dangerText,
    backgroundColor: colors.dangerBg,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  upgradeBanner: {
    backgroundColor: colors.warningLightBg,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderLeftWidth: 4,
    borderLeftColor: colors.warningAccent,
  },
  upgradeBannerTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.warningText,
    marginBottom: spacing.xs,
  },
  upgradeBannerText: {
    fontSize: fontSizes.sm,
    color: colors.warningText,
    lineHeight: 20,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgSubtle,
  },
  tierRowActive: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
  },
  tierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tierRange: {
    fontSize: fontSizes.base,
    color: colors.text,
  },
  tierPrice: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  footer: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.base,
  },
  spacer: {
    height: spacing.md,
  },
});
