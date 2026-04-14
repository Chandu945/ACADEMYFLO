'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { SubscriptionStatus, TierKey } from '@playconnect/contracts';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import styles from './page.module.css';

type TierPricing = {
  tierKey: TierKey;
  min: number;
  max: number | null;
  priceInr: number;
};

type PendingTierChange = {
  tierKey: string;
  effectiveAt: string;
};

type SubscriptionData = {
  status: SubscriptionStatus;
  trialEndAt: string;
  paidEndAt: string | null;
  tierKey: string | null;
  daysRemaining: number;
  canAccessApp: boolean;
  blockReason: string | null;
  activeStudentCount: number;
  currentTierKey: string | null;
  requiredTierKey: string;
  pendingTierChange: PendingTierChange | null;
  tiers: TierPricing[];
};

function statusBadgeVariant(status: SubscriptionStatus): 'info' | 'success' | 'warning' | 'danger' | 'default' {
  switch (status) {
    case 'TRIAL': return 'info';
    case 'ACTIVE_PAID': return 'success';
    case 'EXPIRED_GRACE': return 'warning';
    case 'BLOCKED':
    case 'DISABLED': return 'danger';
    default: return 'default';
  }
}

function statusLabel(status: SubscriptionStatus): string {
  switch (status) {
    case 'TRIAL': return 'Trial';
    case 'ACTIVE_PAID': return 'Active';
    case 'EXPIRED_GRACE': return 'Expired (Grace)';
    case 'BLOCKED': return 'Blocked';
    case 'DISABLED': return 'Disabled';
    default: return status;
  }
}

function tierLabel(tierKey: string): string {
  switch (tierKey) {
    case 'TIER_0_50': return '0–50 students';
    case 'TIER_51_100': return '51–100 students';
    case 'TIER_101_PLUS': return '101–∞ students';
    default: return tierKey;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/subscription', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (res.ok) {
        setSubscription(await res.json());
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error || `Failed to load subscription (${res.status})`);
      }
    } catch {
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    if (subscription && (subscription.status === 'BLOCKED' || subscription.status === 'DISABLED')) {
      router.replace('/subscription-blocked');
    }
  }, [subscription, router]);

  const handlePayment = useCallback(async () => {
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setPaymentError(body?.error || 'Failed to initiate payment');
        return;
      }
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setPaymentError('Payment gateway unavailable. Please try again later.');
      }
    } catch {
      setPaymentError('Network error. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  }, [accessToken]);

  if (loading) return <Spinner centered size="lg" />;

  const isOwner = user?.role === 'OWNER';
  const needsUpgrade = subscription && subscription.requiredTierKey !== subscription.currentTierKey;
  const showPayButton = isOwner && subscription && subscription.status !== 'ACTIVE_PAID' && subscription.status !== 'DISABLED';

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Subscription</h1>

      {error && <Alert variant="error" message={error} action={{ label: 'Retry', onClick: fetchSubscription }} />}
      {paymentError && <Alert variant="error" message={paymentError} />}

      {/* Trial Banner */}
      {subscription?.status === 'TRIAL' && subscription.daysRemaining <= 7 && (
        <Alert
          variant={subscription.daysRemaining <= 3 ? 'error' : 'warning'}
          message={
            subscription.daysRemaining <= 0
              ? 'Your free trial has ended. Subscribe now to continue.'
              : subscription.daysRemaining === 1
                ? 'Your free trial ends tomorrow. Subscribe now to continue.'
                : `Your free trial ends in ${subscription.daysRemaining} days. Subscribe now.`
          }
        />
      )}

      {/* Grace Period Banner */}
      {subscription?.status === 'EXPIRED_GRACE' && (
        <Alert
          variant="error"
          message={
            subscription.daysRemaining <= 0
              ? 'Your subscription expired. Renew now to keep access.'
              : subscription.daysRemaining === 1
                ? 'Your subscription expired. You have 1 day left to renew.'
                : `Your subscription expired. You have ${subscription.daysRemaining} days left to renew.`
          }
        />
      )}

      {/* Tier Upgrade Required Banner */}
      {needsUpgrade && (
        <div className={styles.upgradeBanner}>
          <strong>Tier Change Required</strong>
          <p>
            Your active student count ({subscription!.activeStudentCount}) requires the <strong>{tierLabel(subscription!.requiredTierKey)}</strong> tier.
            {subscription!.pendingTierChange && (
              <> Change to {tierLabel(subscription!.pendingTierChange.tierKey)} effective {formatDate(subscription!.pendingTierChange.effectiveAt)}.</>
            )}
          </p>
        </div>
      )}

      {/* Current Plan Info */}
      {subscription && (
        <div className={styles.currentPlan}>
          <div className={styles.planHeader}>
            <span className={styles.planTitle}>Current Plan</span>
            <Badge variant={statusBadgeVariant(subscription.status)}>{statusLabel(subscription.status)}</Badge>
          </div>
          <div className={styles.planStats}>
            <div className={styles.planStat}>
              <div className={styles.planStatValue}>{subscription.daysRemaining}</div>
              <div className={styles.planStatLabel}>Days Remaining</div>
            </div>
            <div className={styles.planStat}>
              <div className={styles.planStatValue}>{subscription.activeStudentCount}</div>
              <div className={styles.planStatLabel}>Active Students</div>
            </div>
            <div className={styles.planStat}>
              <div className={styles.planStatValue}>{subscription.currentTierKey ? tierLabel(subscription.currentTierKey) : '—'}</div>
              <div className={styles.planStatLabel}>Current Tier</div>
            </div>
            <div className={styles.planStat}>
              <div className={styles.planStatValue}>{tierLabel(subscription.requiredTierKey)}</div>
              <div className={styles.planStatLabel}>Required Tier</div>
            </div>
          </div>
          {subscription.trialEndAt && (
            <div className={styles.planDetail}>Trial Ends: {formatDate(subscription.trialEndAt)}</div>
          )}
          {subscription.paidEndAt && (
            <div className={styles.planDetail}>Paid Until: {formatDate(subscription.paidEndAt)}</div>
          )}
        </div>
      )}

      {/* Pricing Plans */}
      {subscription && (
        <div className={styles.tierSection}>
          <h2 className={styles.tierTitle}>Pricing Plans</h2>
          <div className={styles.tierGrid}>
            {subscription.tiers.map((tier) => {
              const isCurrent = tier.tierKey === subscription.currentTierKey;
              const isRequired = tier.tierKey === subscription.requiredTierKey;
              return (
                <div key={tier.tierKey} className={`${styles.tierCard} ${isCurrent ? styles.current : ''} ${isRequired && !isCurrent ? styles.required : ''}`}>
                  <div className={styles.tierName}>
                    {tierLabel(tier.tierKey)}
                    {isCurrent && <Badge variant="info">Current</Badge>}
                    {isRequired && !isCurrent && <Badge variant="warning">Required</Badge>}
                  </div>
                  <div className={styles.tierPrice}>₹{tier.priceInr}/mo</div>
                  <div className={styles.tierRange}>{tier.min}–{tier.max ?? '∞'} students</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pay / Subscribe Button */}
      {showPayButton && (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={paymentLoading}
          onClick={handlePayment}
        >
          Subscribe — ₹{subscription!.tiers.find((t) => t.tierKey === subscription!.requiredTierKey)?.priceInr ?? 299}/mo
        </Button>
      )}

      {/* Refresh */}
      <Button variant="outline" size="md" fullWidth onClick={fetchSubscription} style={{ marginTop: '1rem' }}>
        Refresh Status
      </Button>
    </div>
  );
}
