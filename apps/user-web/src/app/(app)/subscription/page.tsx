'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/application/auth/use-auth';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import styles from './page.module.css';

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
  const { accessToken } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch_() {
      setLoading(true);
      try {
        const res = await fetch('/api/subscription', {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (res.ok) {
          setSubscription(await res.json());
        } else {
          // Use defaults
          setSubscription({
            status: 'ACTIVE',
            tier: 'Starter',
            daysRemaining: 30,
            studentCount: 0,
            maxStudents: 25,
            expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          });
        }
      } catch {
        setError('Failed to load subscription data');
      } finally {
        setLoading(false);
      }
    }
    fetch_();
  }, [accessToken]);

  const handleUpgrade = useCallback(async (tier: string) => {
    try {
      await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ tier }),
      });
    } catch {
      // Handle error
    }
  }, [accessToken]);

  if (loading) return <Spinner centered size="lg" />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Subscription</h1>

      {error && <Alert variant="error" message={error} />}

      {/* Current Plan */}
      {subscription && (
        <div className={styles.currentPlan}>
          <div className={styles.planHeader}>
            <span className={styles.planTitle}>Current Plan</span>
            <span className={styles.planBadge}>{subscription.status}</span>
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
                <div style={{ marginTop: 'var(--space-4)' }}>
                  {isCurrent ? (
                    <Button variant="outline" size="sm" fullWidth disabled>Current Plan</Button>
                  ) : (
                    <Button variant="primary" size="sm" fullWidth onClick={() => handleUpgrade(tier.name)}>
                      {tier.price === 'Free' ? 'Downgrade' : 'Upgrade'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
