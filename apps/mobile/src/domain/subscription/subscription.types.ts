import type { SubscriptionStatus, TierKey } from '@playconnect/contracts';

export type { SubscriptionStatus, TierKey };

export type PendingTierChange = {
  tierKey: TierKey;
  effectiveAt: string;
};

export type TierPricing = {
  tierKey: TierKey;
  min: number;
  max: number | null;
  priceInr: number;
};

export type SubscriptionInfo = {
  status: SubscriptionStatus;
  trialEndAt: string;
  paidEndAt: string | null;
  tierKey: TierKey | null;
  daysRemaining: number;
  canAccessApp: boolean;
  blockReason: string | null;
  activeStudentCount: number;
  currentTierKey: TierKey | null;
  requiredTierKey: TierKey;
  pendingTierChange: PendingTierChange | null;
  tiers: TierPricing[];
};
