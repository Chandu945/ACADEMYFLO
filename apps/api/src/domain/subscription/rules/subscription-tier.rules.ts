import type { TierKey } from '@playconnect/contracts';
import { TIER_KEYS, TIER_PRICING_INR, TIER_RANGES } from '@playconnect/contracts';

/**
 * Determine the required tier based on active student count.
 * Derives boundaries from the shared TIER_RANGES constant.
 */
export function requiredTierForCount(activeStudentCount: number): TierKey {
  for (const key of TIER_KEYS) {
    const range = TIER_RANGES[key];
    if (range.max === null || activeStudentCount <= range.max) {
      return key;
    }
  }
  return TIER_KEYS[TIER_KEYS.length - 1]!;
}

export interface PendingTierChange {
  tierKey: TierKey;
  effectiveAt: Date;
}

/**
 * Compute pending tier change for next billing cycle.
 *
 * Rules:
 * - If paid cycle exists AND requiredTierKey != currentTierKey → pending change
 * - effectiveAt = paidEndAt + 1 day (start of next billing cycle)
 * - If requiredTierKey == currentTierKey → no pending change (cleared)
 * - If no paid cycle → no pending change (trial/blocked — display-only)
 */
export function computePendingTierChange(
  currentTierKey: TierKey | null,
  requiredTierKey: TierKey,
  paidEndAt: Date | null,
): PendingTierChange | null {
  if (!paidEndAt || !currentTierKey) return null;
  if (requiredTierKey === currentTierKey) return null;

  const nextCycleStart = new Date(paidEndAt.getTime() + 24 * 60 * 60 * 1000);
  return {
    tierKey: requiredTierKey,
    effectiveAt: nextCycleStart,
  };
}

/** Static tier pricing metadata for API responses, derived from contracts. */
export const TIER_TABLE = TIER_KEYS.map((tierKey) => ({
  tierKey,
  min: TIER_RANGES[tierKey].min,
  max: TIER_RANGES[tierKey].max,
  priceInr: TIER_PRICING_INR[tierKey],
}));
