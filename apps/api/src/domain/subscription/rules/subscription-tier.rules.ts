import type { TierKey } from '@playconnect/contracts';

/**
 * Determine the required tier based on active student count.
 * Pure domain rule — no infrastructure dependencies.
 */
export function requiredTierForCount(activeStudentCount: number): TierKey {
  if (activeStudentCount <= 50) return 'TIER_0_50';
  if (activeStudentCount <= 100) return 'TIER_51_100';
  return 'TIER_101_PLUS';
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

/** Static tier pricing metadata for API responses */
export const TIER_TABLE = [
  { tierKey: 'TIER_0_50' as TierKey, min: 0, max: 50, priceInr: 299 },
  { tierKey: 'TIER_51_100' as TierKey, min: 51, max: 100, priceInr: 499 },
  { tierKey: 'TIER_101_PLUS' as TierKey, min: 101, max: null as number | null, priceInr: 699 },
];
