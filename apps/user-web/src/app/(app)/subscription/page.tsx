'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { SubscriptionStatus, TierKey } from '@academyflo/contracts';
import { useAuth } from '@/application/auth/use-auth';
import { csrfHeaders } from '@/infra/auth/csrf-client';
import { openCashfreeCheckout } from '@/infra/payments/cashfree-checkout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import styles from './page.module.css';

/** Key under which a pending Cashfree orderId is cached so we can resume polling
 * after the user returns from the hosted checkout. orderId is not sensitive, so
 * sessionStorage is acceptable. Cleared on terminal status or manual cancel. */
const PENDING_ORDER_KEY = 'academyflo_pending_sub_order';

/** Exponential backoff schedule (ms). Capped at ~2 minutes total. */
const POLL_SCHEDULE_MS = [2000, 3000, 5000, 8000, 13000, 21000, 30000, 30000];

type PendingPoll =
  | { state: 'idle' }
  | { state: 'polling'; orderId: string; attempt: number; sessionExpiresAtMs?: number }
  | { state: 'success'; orderId: string }
  | { state: 'failed'; orderId: string; reason: string }
  | { state: 'timeout'; orderId: string };

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
  const [pendingPoll, setPendingPoll] = useState<PendingPoll>({ state: 'idle' });
  // Ref-based guard so a second click during the network round-trip is rejected
  // even before React has re-rendered with paymentLoading=true.
  const paymentInFlightRef = useRef(false);

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

  // --- Pending payment polling ---------------------------------------------
  // On mount / return-from-checkout, check sessionStorage for a pending orderId
  // (stashed just before the Cashfree redirect) and poll the payment-status
  // endpoint with exponential backoff. Terminal statuses clear the key and
  // refetch the subscription. Handles the three user paths:
  //   (a) User completed checkout and Cashfree redirected back → poll sees SUCCESS
  //   (b) User cancelled / failed → poll sees FAILED, we show error + clean up
  //   (c) User closed the tab mid-flow → next page visit resumes polling
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!accessToken) return;
    const stored = sessionStorage.getItem(PENDING_ORDER_KEY);
    if (!stored) return;
    try {
      const { orderId } = JSON.parse(stored) as { orderId: string };
      if (typeof orderId === 'string' && orderId.length > 0) {
        setPendingPoll({ state: 'polling', orderId, attempt: 0 });
      }
    } catch {
      sessionStorage.removeItem(PENDING_ORDER_KEY);
    }
  }, [accessToken]);

  useEffect(() => {
    if (pendingPoll.state !== 'polling') return;
    const { orderId, attempt, sessionExpiresAtMs } = pendingPoll;

    // Mobile parity: bail early once Cashfree has marked the session expired.
    // sessionExpiresAtMs is only set on the live path (fresh initiate); the
    // resume path falls through to the server, which still surfaces EXPIRED.
    if (sessionExpiresAtMs && Date.now() > sessionExpiresAtMs) {
      sessionStorage.removeItem(PENDING_ORDER_KEY);
      setPendingPoll({ state: 'failed', orderId, reason: 'Payment session expired. Please try again.' });
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/subscription/payments/${encodeURIComponent(orderId)}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          signal: controller.signal,
        });
        if (cancelled) return;
        if (res.ok) {
          const data: { status?: string } = await res.json().catch(() => ({}));
          if (data.status === 'SUCCESS') {
            sessionStorage.removeItem(PENDING_ORDER_KEY);
            setPendingPoll({ state: 'success', orderId });
            fetchSubscription();
            return;
          }
          if (data.status === 'FAILED') {
            sessionStorage.removeItem(PENDING_ORDER_KEY);
            setPendingPoll({ state: 'failed', orderId, reason: 'Payment was not completed.' });
            fetchSubscription();
            return;
          }
          // PENDING — keep polling
        }
        // Non-ok or still PENDING: advance unless we're out of attempts
        if (attempt + 1 >= POLL_SCHEDULE_MS.length) {
          setPendingPoll({ state: 'timeout', orderId });
          return;
        }
        setPendingPoll({ state: 'polling', orderId, attempt: attempt + 1, sessionExpiresAtMs });
      } catch {
        if (cancelled) return;
        if (attempt + 1 >= POLL_SCHEDULE_MS.length) {
          setPendingPoll({ state: 'timeout', orderId });
          return;
        }
        setPendingPoll({ state: 'polling', orderId, attempt: attempt + 1, sessionExpiresAtMs });
      }
    }, POLL_SCHEDULE_MS[attempt] ?? 30000);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [pendingPoll, accessToken, fetchSubscription]);

  const dismissPendingResult = useCallback(() => {
    setPendingPoll({ state: 'idle' });
  }, []);

  const cancelPendingAndRetry = useCallback(() => {
    // User-initiated abandonment of a stuck PENDING. We do NOT call the backend
    // to cancel the Cashfree order — doing so requires another server round-trip
    // and the order will auto-expire anyway. Simply clearing the local pointer
    // lets them click Pay again; a new initiate will create a new orderId.
    sessionStorage.removeItem(PENDING_ORDER_KEY);
    setPendingPoll({ state: 'idle' });
  }, []);

  const handlePayment = useCallback(async () => {
    if (paymentInFlightRef.current) return; // fast guard against rapid double-click
    paymentInFlightRef.current = true;
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: csrfHeaders({
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        }),
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setPaymentError(body?.error || body?.message || 'Failed to initiate payment');
        return;
      }
      const data: { orderId?: string; paymentSessionId?: string; expiresAt?: string } = await res.json();
      if (!data.paymentSessionId || !data.orderId) {
        setPaymentError('Payment gateway returned an incomplete session. Please try again.');
        return;
      }
      // Mobile parity: capture Cashfree's session expiry so the poller can
      // bail fast once it's known to be dead. Falls back to undefined if
      // backend didn't return one (resume path will see EXPIRED via server).
      const sessionExpiresAtMs = data.expiresAt && Number.isFinite(Date.parse(data.expiresAt))
        ? Date.parse(data.expiresAt)
        : undefined;
      // Stash orderId BEFORE opening the modal so polling resumes if the user
      // closes the tab mid-checkout. Cleared automatically by terminal-state
      // handlers above (success / failed) or via cancelPendingAndRetry.
      sessionStorage.setItem(
        PENDING_ORDER_KEY,
        JSON.stringify({ orderId: data.orderId, startedAt: Date.now() }),
      );
      try {
        await openCashfreeCheckout(data.paymentSessionId);
      } catch (err) {
        sessionStorage.removeItem(PENDING_ORDER_KEY);
        setPaymentError(
          err instanceof Error
            ? err.message
            : 'Failed to open Cashfree checkout. Please try again.',
        );
        return;
      }
      // Modal closed — start polling for terminal state. The polling effect
      // handles SUCCESS / FAILED / timeout and refreshes the subscription
      // card on success.
      setPendingPoll({ state: 'polling', orderId: data.orderId, attempt: 0, sessionExpiresAtMs });
    } catch {
      setPaymentError('Network error. Please try again.');
    } finally {
      paymentInFlightRef.current = false;
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

      {/* Pending payment polling banner */}
      {pendingPoll.state === 'polling' && (
        <Alert
          variant="info"
          title="Verifying your payment…"
          message="Please don't close this tab. We're confirming with the payment gateway."
          action={{ label: 'Cancel and try again', onClick: cancelPendingAndRetry }}
        />
      )}
      {pendingPoll.state === 'success' && (
        <Alert
          variant="success"
          title="Payment received"
          message="Your subscription is now active. Thanks!"
          onDismiss={dismissPendingResult}
        />
      )}
      {pendingPoll.state === 'failed' && (
        <Alert
          variant="error"
          title="Payment was not completed"
          message={pendingPoll.reason}
          onDismiss={dismissPendingResult}
        />
      )}
      {pendingPoll.state === 'timeout' && (
        <Alert
          variant="warning"
          title="Still verifying…"
          message="Verification is taking longer than usual. If you completed the payment, refresh this page in a minute — or cancel to try again."
          action={{ label: 'Cancel and try again', onClick: cancelPendingAndRetry }}
        />
      )}

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
