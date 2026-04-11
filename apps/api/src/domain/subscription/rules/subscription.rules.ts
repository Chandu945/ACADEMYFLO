import type { SubscriptionStatus } from '@playconnect/contracts';
import type { Subscription } from '../entities/subscription.entity';

const GRACE_PERIOD_MS = 0; // No grace period — blocked immediately on expiry

export interface SubscriptionEvaluation {
  status: SubscriptionStatus;
  daysRemaining: number;
  canAccessApp: boolean;
  blockReason: string | null;
}

/**
 * Evaluate subscription status deterministically.
 * Pure domain function — no framework dependencies.
 *
 * Priority order:
 * 1. DISABLED (academy login disabled by Super Admin)
 * 2. ACTIVE_PAID (within paid period)
 * 3. EXPIRED_GRACE (paid expired but within 3-day grace)
 * 4. TRIAL (within trial period, no active paid)
 * 5. BLOCKED (everything else)
 */
export function evaluateSubscriptionStatus(
  now: Date,
  academyLoginDisabled: boolean,
  subscription: Subscription,
): SubscriptionEvaluation {
  if (academyLoginDisabled) {
    return {
      status: 'DISABLED',
      daysRemaining: 0,
      canAccessApp: false,
      blockReason: 'Academy access has been disabled by administrator',
    };
  }

  const nowMs = now.getTime();

  // Check paid subscription
  if (subscription.paidStartAt && subscription.paidEndAt) {
    const paidEndMs = subscription.paidEndAt.getTime();

    if (nowMs <= paidEndMs) {
      const remaining = Math.ceil((paidEndMs - nowMs) / (24 * 60 * 60 * 1000));
      return {
        status: 'ACTIVE_PAID',
        daysRemaining: remaining,
        canAccessApp: true,
        blockReason: null,
      };
    }

    // Grace period
    const graceEndMs = paidEndMs + GRACE_PERIOD_MS;
    if (nowMs <= graceEndMs) {
      const remaining = Math.ceil((graceEndMs - nowMs) / (24 * 60 * 60 * 1000));
      return {
        status: 'EXPIRED_GRACE',
        daysRemaining: remaining,
        canAccessApp: true,
        blockReason: null,
      };
    }
  }

  // Check trial
  const trialEndMs = subscription.trialEndAt.getTime();
  if (nowMs <= trialEndMs) {
    const remaining = Math.ceil((trialEndMs - nowMs) / (24 * 60 * 60 * 1000));
    return {
      status: 'TRIAL',
      daysRemaining: remaining,
      canAccessApp: true,
      blockReason: null,
    };
  }

  // Blocked
  return {
    status: 'BLOCKED',
    daysRemaining: 0,
    canAccessApp: false,
    blockReason: 'Subscription expired. Please subscribe to continue.',
  };
}
