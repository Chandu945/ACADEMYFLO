import { priceForTier, isAmountValid, generateOrderId, computePaidDates } from './subscription-payment.rules';

describe('priceForTier', () => {
  it('returns 299 for TIER_0_50', () => {
    expect(priceForTier('TIER_0_50')).toBe(299);
  });

  it('returns 499 for TIER_51_100', () => {
    expect(priceForTier('TIER_51_100')).toBe(499);
  });

  it('returns 699 for TIER_101_PLUS', () => {
    expect(priceForTier('TIER_101_PLUS')).toBe(699);
  });
});

describe('isAmountValid', () => {
  it('returns true for matching tier + amount', () => {
    expect(isAmountValid('TIER_0_50', 299)).toBe(true);
    expect(isAmountValid('TIER_51_100', 499)).toBe(true);
    expect(isAmountValid('TIER_101_PLUS', 699)).toBe(true);
  });

  it('returns false for mismatched tier + amount', () => {
    expect(isAmountValid('TIER_0_50', 499)).toBe(false);
    expect(isAmountValid('TIER_51_100', 299)).toBe(false);
  });
});

describe('generateOrderId', () => {
  it('generates a valid order ID with pc_sub prefix', () => {
    const orderId = generateOrderId();
    expect(orderId).toMatch(/^pc_sub_\d{8}_[a-z0-9]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateOrderId()));
    expect(ids.size).toBe(100);
  });

  it('has length between 3 and 45', () => {
    const orderId = generateOrderId();
    expect(orderId.length).toBeGreaterThanOrEqual(3);
    expect(orderId.length).toBeLessThanOrEqual(45);
  });
});

describe('computePaidDates', () => {
  it('starts after trial if trial is active', () => {
    const now = new Date('2026-03-10T12:00:00+05:30');
    const trialEndAt = new Date('2026-03-31T23:59:59+05:30');

    const { paidStartAt, paidEndAt } = computePaidDates(now, trialEndAt);

    // paidStartAt should be day after trialEndAt
    expect(paidStartAt.getDate()).toBe(1); // April 1
    expect(paidStartAt.getMonth()).toBe(3); // April (0-indexed)

    // paidEndAt should be ~1 month later - 1 day
    expect(paidEndAt.getMonth()).toBe(3); // April
    expect(paidEndAt.getDate()).toBe(30); // April 30
  });

  it('starts today if trial expired', () => {
    const now = new Date('2026-04-15T12:00:00+05:30');
    const trialEndAt = new Date('2026-03-31T23:59:59+05:30');

    const { paidStartAt, paidEndAt } = computePaidDates(now, trialEndAt);

    expect(paidStartAt.getDate()).toBe(15); // April 15
    expect(paidStartAt.getMonth()).toBe(3); // April

    expect(paidEndAt.getDate()).toBe(14); // May 14
    expect(paidEndAt.getMonth()).toBe(4); // May
  });

  it('paidEndAt is always later than paidStartAt', () => {
    const now = new Date('2026-01-15T12:00:00+05:30');
    const trialEndAt = new Date('2026-01-10T23:59:59+05:30');

    const { paidStartAt, paidEndAt } = computePaidDates(now, trialEndAt);

    expect(paidEndAt.getTime()).toBeGreaterThan(paidStartAt.getTime());
  });
});
