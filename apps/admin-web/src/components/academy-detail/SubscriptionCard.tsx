'use client';

import type { AcademySubscription } from '@/domain/admin/academy-detail';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

import styles from './SubscriptionCard.module.css';

type SubscriptionCardProps = {
  subscription: AcademySubscription;
};

const DASH = '\u2014';

function formatTier(tierKey: string | null): string {
  if (!tierKey) return DASH;
  switch (tierKey) {
    case 'TIER_0_50':
      return '0\u201350';
    case 'TIER_51_100':
      return '51\u2013100';
    case 'TIER_101_PLUS':
      return '101+';
    default:
      return tierKey;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return DASH;
  return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' });
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
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
      return 'default';
  }
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  return (
    <Card title="Subscription">
      <dl className={styles.list}>
        <div className={styles.row}>
          <dt>Status</dt>
          <dd>
            <Badge
              label={subscription.status.replace(/_/g, ' ')}
              variant={statusVariant(subscription.status)}
            />
          </dd>
        </div>
        <div className={styles.row}>
          <dt>Tier</dt>
          <dd>{formatTier(subscription.tierKey)}</dd>
        </div>
        <div className={styles.row}>
          <dt>Trial End</dt>
          <dd>{formatDate(subscription.trialEndAt)}</dd>
        </div>
        <div className={styles.row}>
          <dt>Paid Start</dt>
          <dd>{formatDate(subscription.paidStartAt)}</dd>
        </div>
        <div className={styles.row}>
          <dt>Paid End</dt>
          <dd>{formatDate(subscription.paidEndAt)}</dd>
        </div>
        {subscription.pendingTierKey && (
          <div className={styles.row}>
            <dt>Pending Tier</dt>
            <dd>
              {formatTier(subscription.pendingTierKey)}
              {subscription.pendingTierEffectiveAt
                ? ` (effective ${formatDate(subscription.pendingTierEffectiveAt)})`
                : ''}
            </dd>
          </div>
        )}
        {subscription.manualNotes && (
          <div className={styles.row}>
            <dt>Notes</dt>
            <dd>{subscription.manualNotes}</dd>
          </div>
        )}
        {subscription.paymentReference && (
          <div className={styles.row}>
            <dt>Payment Ref</dt>
            <dd>{subscription.paymentReference}</dd>
          </div>
        )}
      </dl>
    </Card>
  );
}
