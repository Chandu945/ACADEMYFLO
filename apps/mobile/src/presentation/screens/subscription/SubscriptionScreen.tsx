import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { AppIcon } from '../../components/ui/AppIcon';
import { PaymentStatusBanner } from '../../components/subscription/PaymentStatusBanner';
import { PayWithCashfreeButton } from '../../components/subscription/PayWithCashfreeButton';
import { usePaymentFlow } from '../../../application/subscription/use-payment-flow';
import { subscriptionApi } from '../../../infra/subscription/subscription-api';
import { openCashfreeCheckout } from '../../../infra/payments/cashfree-web-checkout';

const paymentDeps = {
  subscriptionApi,
  checkout: { openCheckout: openCashfreeCheckout },
};
import type {
  TierPricing,
  PendingTierChange,
  TierKey,
} from '../../../domain/subscription/subscription.types';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
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

/* ── Row helpers ──────────────────────────────────────────────────────────── */

function InfoRow({
  icon,
  label,
  value,
  isLast,
  colors,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
  isLast?: boolean;
  colors: Colors;
}) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
      <View style={styles.infoIconTile}>
        <AppIcon name={icon} size={16} color={colors.textSecondary} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      {typeof value === 'string' ? <Text style={styles.infoValue}>{value}</Text> : value}
    </View>
  );
}

/* ── Tier row ─────────────────────────────────────────────────────────────── */

function TierRow({
  tier,
  isCurrent,
  isRequired,
  isLast,
}: {
  tier: TierPricing;
  isCurrent: boolean;
  isRequired: boolean;
  isLast: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isHighlighted = isCurrent || (isRequired && !isCurrent);
  return (
    <View
      style={[
        styles.tierRow,
        !isLast && styles.tierRowBorder,
        isHighlighted && styles.tierRowHighlight,
      ]}
      testID={`tier-row-${tier.tierKey}`}
    >
      <View style={styles.tierLeft}>
        <Text style={[styles.tierRange, isHighlighted && styles.tierRangeHighlight]}>
          {tier.min}
          {'\u2013'}
          {tier.max ?? '\u221E'} students
        </Text>
        {isCurrent ? <Badge label="Current" variant="success" dot uppercase /> : null}
        {isRequired && !isCurrent ? <Badge label="Required" variant="warning" dot uppercase /> : null}
      </View>
      <Text style={[styles.tierPrice, isHighlighted && styles.tierPriceHighlight]}>
        {'\u20B9'}
        {tier.priceInr}
        /mo
      </Text>
    </View>
  );
}

/* ── Upgrade banner ──────────────────────────────────────────────────────── */

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
        Your active student count requires the{' '}
        <Text style={styles.upgradeBannerBold}>{tierLabel(requiredTierKey)}</Text> tier.
      </Text>
      {pendingChange ? (
        <Text style={[styles.upgradeBannerText, { marginTop: spacing.xs }]}>
          Change to {tierLabel(pendingChange.tierKey)} effective{' '}
          {formatDate(pendingChange.effectiveAt)}.
        </Text>
      ) : null}
    </View>
  );
}

/* ── Main screen ─────────────────────────────────────────────────────────── */

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

  const paymentFlow = usePaymentFlow(paymentDeps, handleRefresh);

  // Resume polling for a PENDING payment carried over from a previous app
  // session (e.g. user force-killed the app mid-checkout). The backend's
  // `/subscription/me` surfaces the open orderId; we only resume once per
  // orderId — the hook itself guards against re-entry.
  const resumedOrderRef = useRef<string | null>(null);
  useEffect(() => {
    const pendingId = subscription?.pendingPaymentOrderId ?? null;
    if (!pendingId) return;
    if (resumedOrderRef.current === pendingId) return;
    if (paymentFlow.status !== 'idle') return;
    resumedOrderRef.current = pendingId;
    paymentFlow.resumePayment(pendingId);
  }, [subscription, paymentFlow]);

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

  return (
    <Screen scroll={false}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ────────────────────────────────────────────────────── */}
        <View style={styles.hero} testID="status-card">
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconTile}>
              <LinearGradient
                colors={[gradient.start, gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <AppIcon name="shield-check-outline" size={22} color="#FFFFFF" />
            </View>
            <Badge
              label={statusLabel(subscription.status)}
              variant={statusVariant(subscription.status)}
              dot
              uppercase
              testID="status-badge"
            />
          </View>
          <Text style={styles.heroDays}>{subscription.daysRemaining}</Text>
          <Text style={styles.heroDaysLabel}>
            {subscription.daysRemaining === 1 ? 'day remaining' : 'days remaining'}
          </Text>
          <Text style={styles.heroTier}>{tierLabel(subscription.currentTierKey)}</Text>
        </View>

        {/* ── Details card ────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <AppIcon name="information-outline" size={18} color={colors.text} />
            <Text style={styles.sectionTitle}>Details</Text>
          </View>

          {subscription.trialEndAt ? (
            <InfoRow
              icon="clock-outline"
              label="Trial Ends"
              value={formatDate(subscription.trialEndAt)}
              colors={colors}
            />
          ) : null}

          {subscription.paidEndAt ? (
            <InfoRow
              icon="calendar-check-outline"
              label="Paid Until"
              value={formatDate(subscription.paidEndAt)}
              colors={colors}
            />
          ) : null}

          <InfoRow
            icon="account-group-outline"
            label="Active Students"
            value={String(subscription.activeStudentCount)}
            colors={colors}
          />
          <InfoRow
            icon="layers-outline"
            label="Required Tier"
            value={tierLabel(subscription.requiredTierKey)}
            isLast
            colors={colors}
          />

          {subscription.blockReason ? (
            <View style={styles.blockReasonBox}>
              <Text style={styles.blockReasonText}>{subscription.blockReason}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Grace-window heads-up ───────────────────────────────────── */}
        {subscription.studentsInGraceWindow &&
        subscription.studentsInGraceWindow > 0 &&
        subscription.projectedTierKey &&
        subscription.projectedTierKey !== subscription.requiredTierKey ? (
          <View style={styles.graceBannerBox}>
            <Text style={styles.graceBannerTitle}>Tier may change soon</Text>
            <Text style={styles.graceBannerText}>
              {subscription.studentsInGraceWindow}{' '}
              {subscription.studentsInGraceWindow === 1 ? 'student is' : 'students are'} in the
              24-hour review window. If they stay, your tier will move to{' '}
              <Text style={styles.graceBannerBold}>
                {tierLabel(subscription.projectedTierKey)}
              </Text>{' '}
              at renewal.
            </Text>
          </View>
        ) : null}

        {/* ── Upgrade banner ──────────────────────────────────────────── */}
        <UpgradeBanner
          pendingChange={subscription.pendingTierChange}
          requiredTierKey={subscription.requiredTierKey}
          currentTierKey={subscription.currentTierKey}
        />

        {/* ── Payment status takeover (renders as full-screen Modal) ──── */}
        <PaymentStatusBanner
          status={paymentFlow.status}
          error={paymentFlow.error}
          onDismiss={paymentFlow.reset}
        />

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

        {/* ── Pricing table ───────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <AppIcon name="tag-outline" size={18} color={colors.text} />
            <Text style={styles.sectionTitle}>Pricing Plans</Text>
          </View>
          {subscription.tiers.map((tier, index) => (
            <TierRow
              key={tier.tierKey}
              tier={tier}
              isCurrent={tier.tierKey === subscription.currentTierKey}
              isRequired={tier.tierKey === subscription.requiredTierKey}
              isLast={index === subscription.tiers.length - 1}
            />
          ))}
        </View>

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <View style={styles.actions}>
          <Button
            title="Refresh Status"
            variant="secondary"
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

/* ── Styles ────────────────────────────────────────────────────────────── */

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: fontSizes.md,
      color: colors.textSecondary,
    },
    content: {
      padding: spacing.base,
      paddingBottom: spacing.xl,
    },

    /* ── Hero ─────────────────────────────────────────────────────── */
    hero: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.base,
      marginBottom: spacing.md,
      alignItems: 'flex-start',
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: spacing.sm,
    },
    heroIconTile: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroDays: {
      fontSize: fontSizes['4xl'],
      fontWeight: fontWeights.heavy,
      color: colors.text,
      letterSpacing: -1,
      lineHeight: 42,
    },
    heroDaysLabel: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginTop: 2,
      marginBottom: spacing.xs,
    },
    heroTier: {
      fontSize: fontSizes.xs,
      color: colors.textDisabled,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontWeight: fontWeights.semibold,
    },

    /* ── Cards ────────────────────────────────────────────────────── */
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.base,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },

    /* ── Info rows ────────────────────────────────────────────────── */
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm + 2,
      gap: spacing.sm,
    },
    infoRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    infoIconTile: {
      width: 28,
      height: 28,
      borderRadius: radius.md,
      backgroundColor: colors.bgSubtle,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoLabel: {
      flex: 1,
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      textAlign: 'right',
    },

    /* ── Block reason ─────────────────────────────────────────────── */
    blockReasonBox: {
      backgroundColor: colors.warningLightBg,
      borderRadius: radius.md,
      padding: spacing.sm,
      marginTop: spacing.md,
    },
    blockReasonText: {
      fontSize: fontSizes.sm,
      color: colors.warningText,
      textAlign: 'center',
      lineHeight: 18,
    },

    /* ── Grace-window banner ──────────────────────────────────────── */
    graceBannerBox: {
      backgroundColor: colors.infoBg,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.info,
      borderLeftWidth: 4,
      padding: spacing.base,
      marginBottom: spacing.md,
    },
    graceBannerTitle: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.bold,
      color: colors.infoText,
      marginBottom: spacing.xs,
    },
    graceBannerText: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    graceBannerBold: {
      fontWeight: fontWeights.bold,
      color: colors.text,
    },

    /* ── Upgrade banner ───────────────────────────────────────────── */
    upgradeBanner: {
      backgroundColor: colors.warningBg,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.warningBorder,
      borderLeftWidth: 4,
      padding: spacing.base,
      marginBottom: spacing.md,
    },
    upgradeBannerTitle: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.bold,
      color: colors.warning,
      marginBottom: spacing.xs,
    },
    upgradeBannerText: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    upgradeBannerBold: {
      fontWeight: fontWeights.bold,
    },

    /* ── Tier rows ────────────────────────────────────────────────── */
    tierRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    tierRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tierRowHighlight: {
      backgroundColor: colors.bgSubtle,
      borderRadius: radius.lg,
      marginHorizontal: -spacing.xs,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tierLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    tierRange: {
      fontSize: fontSizes.base,
      color: colors.text,
    },
    tierRangeHighlight: {
      fontWeight: fontWeights.semibold,
      color: colors.textDark,
    },
    tierPrice: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    tierPriceHighlight: {
      color: colors.text,
    },

    /* ── Footer actions ───────────────────────────────────────────── */
    actions: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.base,
    },
    spacer: {
      height: spacing.md,
    },
  });
