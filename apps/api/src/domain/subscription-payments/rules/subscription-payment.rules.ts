import type { TierKey } from '@playconnect/contracts';
import { TIER_TABLE } from '@domain/subscription/rules/subscription-tier.rules';

/**
 * Look up the price for a tier key. Throws if tier not found (programming error).
 */
export function priceForTier(tierKey: TierKey): number {
  const tier = TIER_TABLE.find((t) => t.tierKey === tierKey);
  if (!tier) throw new Error(`Unknown tier: ${tierKey}`);
  return tier.priceInr;
}

/**
 * Validate that amount matches expected tier price.
 */
export function isAmountValid(tierKey: TierKey, amountInr: number): boolean {
  return priceForTier(tierKey) === amountInr;
}

/**
 * Generate an internal order ID for Cashfree.
 * Format: pc_sub_{YYYYMMDD}_{random} — length 3-45, allowed chars: alphanumeric, _, -
 */
export function generateOrderId(): string {
  const now = new Date();
  const dateStr =
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 10);
  return `pc_sub_${dateStr}_${random}`;
}

/**
 * Compute paid subscription start/end dates based on trial status.
 *
 * If trial is still active at purchase time:
 *   paidStartAt = dayAfter(trialEndAt) in IST
 *   paidEndAt = paidStartAt + 1 month - 1 day
 *
 * Otherwise:
 *   paidStartAt = now (IST)
 *   paidEndAt = paidStartAt + 1 month - 1 day
 */
export function computePaidDates(
  now: Date,
  trialEndAt: Date,
): { paidStartAt: Date; paidEndAt: Date } {
  let paidStartAt: Date;

  if (now.getTime() <= trialEndAt.getTime()) {
    // Trial still active — start day after trial ends
    paidStartAt = new Date(trialEndAt.getTime() + 24 * 60 * 60 * 1000);
    paidStartAt.setHours(0, 0, 0, 0);
  } else {
    paidStartAt = new Date(now);
    paidStartAt.setHours(0, 0, 0, 0);
  }

  // paidEndAt = paidStartAt + 1 month - 1 day
  const paidEndAt = new Date(paidStartAt);
  paidEndAt.setMonth(paidEndAt.getMonth() + 1);
  paidEndAt.setDate(paidEndAt.getDate() - 1);
  paidEndAt.setHours(23, 59, 59, 999);

  return { paidStartAt, paidEndAt };
}
