'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import styles from './page.module.css';

type SubscriptionStatus = 'TRIAL' | 'ACTIVE_PAID' | 'EXPIRED_GRACE' | 'BLOCKED' | 'DISABLED' | string;

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

type SubscriptionData = {
  status: string;
  tier: string;
  daysRemaining: number;
  studentCount: number;
  maxStudents: number;
  expiresAt: string;
};

const TIERS = [
  {
    name: 'Starter',
    price: 'Free',
    features: ['Up to 25 students', 'Basic attendance', 'Fee management', 'Email support'],
  },
  {
    name: 'Growth',
    price: '499/mo',
    features: ['Up to 100 students', 'All Starter features', 'Batch management', 'Reports & analytics', 'Staff management'],
  },
  {
    name: 'Pro',
    price: '999/mo',
    features: ['Up to 500 students', 'All Growth features', 'Audit logs', 'Priority support', 'Custom branding'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    features: ['Unlimited students', 'All Pro features', 'Dedicated support', 'API access', 'White-label options'],
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [upgradeConfirm, setUpgradeConfirm] = useState<{ name: string; price: string } | null>(null);

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

  // Redirect to blocked page for BLOCKED/DISABLED statuses
  useEffect(() => {
    if (subscription && (subscription.status === 'BLOCKED' || subscription.status === 'DISABLED')) {
      router.replace('/subscription-blocked');
    }
  }, [subscription, router]);

  const handleUpgrade = useCallback(async (tier: string) => {
    setUpgradeLoading(true);
    setUpgradeError(null);
    setUpgradeSuccess(false);
    try {
      const res = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setUpgradeError(body?.error || `Failed to upgrade to ${tier}`);
        setUpgradeLoading(false);
        return;
      }
      setUpgradeSuccess(true);
      setTimeout(() => setUpgradeSuccess(false), 5000);
      fetchSubscription();
    } catch {
      setUpgradeError('Network error. Please try again.');
    } finally {
      setUpgradeLoading(false);
    }
  }, [accessToken, fetchSubscription]);

  const handleUpgradeConfirm = useCallback(async () => {
    if (!upgradeConfirm) return;
    await handleUpgrade(upgradeConfirm.name);
    setUpgradeConfirm(null);
  }, [upgradeConfirm, handleUpgrade]);

  if (loading) return <Spinner centered size="lg" />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Subscription</h1>

      {error && <Alert variant="error" message={error} action={{ label: 'Retry', onClick: fetchSubscription }} />}
      {upgradeError && <Alert variant="error" message={upgradeError} />}
      {upgradeSuccess && <Alert variant="success" message="Subscription upgraded successfully!" />}

      {/* Trial Banner */}
      {subscription?.status === 'TRIAL' && (
        <div className={styles.trialBanner}>
          <div className={styles.trialBannerContent}>
            <Badge variant="info">Trial</Badge>
            <span className={styles.trialBannerText}>
              You have <strong>{subscription.daysRemaining}</strong> day{subscription.daysRemaining !== 1 ? 's' : ''} remaining in your trial.
            </span>
          </div>
          <Button variant="primary" size="sm" onClick={() => {
            const tierSection = document.querySelector(`.${styles.tierSection}`);
            tierSection?.scrollIntoView({ behavior: 'smooth' });
          }}>
            Upgrade Now
          </Button>
        </div>
      )}

      {/* Expired/Grace Warning Banner */}
      {subscription?.status === 'EXPIRED_GRACE' && (
        <Alert
          variant="warning"
          message="Your subscription has expired. You are in a grace period. Please upgrade to continue using all features."
          action={{
            label: 'Upgrade Now',
            onClick: () => {
              const tierSection = document.querySelector(`.${styles.tierSection}`);
              tierSection?.scrollIntoView({ behavior: 'smooth' });
            },
          }}
        />
      )}

      {/* Current Plan */}
      {subscription && (
        <div className={styles.currentPlan}>
          <div className={styles.planHeader}>
            <span className={styles.planTitle}>Current Plan</span>
            <Badge variant={statusBadgeVariant(subscription.status)}>{statusLabel(subscription.status)}</Badge>
          </div>
          <div className={styles.planStats}>
            <div className={styles.planStat}>
              <div className={styles.planStatValue}>{subscription.tier}</div>
              <div className={styles.planStatLabel}>Plan Tier</div>
            </div>
            <div className={styles.planStat}>
              <div className={styles.planStatValue}>{subscription.daysRemaining}</div>
              <div className={styles.planStatLabel}>Days Remaining</div>
            </div>
            <div className={styles.planStat}>
              <div className={styles.planStatValue}>{subscription.studentCount}/{subscription.maxStudents}</div>
              <div className={styles.planStatLabel}>Students</div>
            </div>
          </div>
        </div>
      )}

      {/* Tier Comparison */}
      <div className={styles.tierSection}>
        <h2 className={styles.tierTitle}>Available Plans</h2>
        <div className={styles.tierGrid}>
          {TIERS.map((tier) => {
            const isCurrent = subscription?.tier === tier.name;
            return (
              <div key={tier.name} className={`${styles.tierCard} ${isCurrent ? styles.current : ''}`}>
                <div className={styles.tierName}>{tier.name}</div>
                <div className={styles.tierPrice}>{tier.price}</div>
                <ul className={styles.tierFeatures}>
                  {tier.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
                <div className={styles.tierAction}>
                  {isCurrent ? (
                    <Button variant="outline" size="sm" fullWidth disabled>Current Plan</Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      loading={upgradeLoading && upgradeConfirm?.name === tier.name}
                      disabled={upgradeLoading}
                      onClick={() => setUpgradeConfirm({ name: tier.name, price: tier.price })}
                    >
                      {tier.price === 'Free' ? 'Downgrade' : 'Upgrade'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upgrade Confirmation */}
      <ConfirmDialog
        open={!!upgradeConfirm}
        onClose={() => setUpgradeConfirm(null)}
        onConfirm={handleUpgradeConfirm}
        title={`${upgradeConfirm?.price === 'Free' ? 'Downgrade' : 'Upgrade'} Plan`}
        message={`Upgrade to ${upgradeConfirm?.name} for ${upgradeConfirm?.price}?`}
        confirmLabel={upgradeConfirm?.price === 'Free' ? 'Downgrade' : 'Upgrade'}
        loading={upgradeLoading}
      />
    </div>
  );
}
