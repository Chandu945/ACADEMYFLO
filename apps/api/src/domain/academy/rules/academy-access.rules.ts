import type { SubscriptionStatus } from '@academyflo/contracts';

/**
 * Academy access evaluation rule.
 * Pure domain function — no framework dependencies.
 *
 * Data retention policy: Academy data is NEVER deleted.
 * All "deactivation" is handled via loginDisabled flag and subscription status.
 * Soft-delete only where explicitly allowed (students).
 */

export interface AcademyAccessInput {
  loginDisabled: boolean;
  subscriptionStatus: SubscriptionStatus;
  canAccessAppFromSubscription: boolean;
}

export interface AcademyAccessResult {
  canAccessApp: boolean;
  effectiveStatus: SubscriptionStatus;
  blockReason: string | null;
}

/**
 * Evaluate whether an academy's users can access the app.
 *
 * If loginDisabled is true, the effective status is always DISABLED
 * regardless of subscription status. This is the Super Admin "disable academy login" action.
 */
export function evaluateAcademyAccess(input: AcademyAccessInput): AcademyAccessResult {
  if (input.loginDisabled) {
    return {
      canAccessApp: false,
      effectiveStatus: 'DISABLED',
      blockReason: 'Academy access has been disabled by administrator',
    };
  }

  return {
    canAccessApp: input.canAccessAppFromSubscription,
    effectiveStatus: input.subscriptionStatus,
    blockReason: input.canAccessAppFromSubscription
      ? null
      : 'Subscription expired. Please subscribe to continue.',
  };
}
