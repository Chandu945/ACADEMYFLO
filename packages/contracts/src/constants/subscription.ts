/** Subscription status values exactly as per SRS */
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE_PAID' | 'EXPIRED_GRACE' | 'BLOCKED' | 'DISABLED';

export const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  'TRIAL',
  'ACTIVE_PAID',
  'EXPIRED_GRACE',
  'BLOCKED',
  'DISABLED',
] as const;

/** Trial duration in days */
export const TRIAL_DURATION_DAYS = 30;

/** Subscription tier keys */
export type TierKey = 'TIER_0_50' | 'TIER_51_100' | 'TIER_101_PLUS';

export const TIER_KEYS: readonly TierKey[] = ['TIER_0_50', 'TIER_51_100', 'TIER_101_PLUS'] as const;

/** Pricing per tier in INR */
export const TIER_PRICING_INR: Record<TierKey, number> = {
  TIER_0_50: 299,
  TIER_51_100: 499,
  TIER_101_PLUS: 699,
};

/** Student count range per tier */
export const TIER_RANGES: Record<TierKey, { min: number; max: number | null }> = {
  TIER_0_50: { min: 0, max: 50 },
  TIER_51_100: { min: 51, max: 100 },
  TIER_101_PLUS: { min: 101, max: null },
};
