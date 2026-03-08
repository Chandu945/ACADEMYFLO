import {
  requiredTierForCount,
  computePendingTierChange,
  TIER_TABLE,
} from './subscription-tier.rules';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('requiredTierForCount', () => {
  it('should return TIER_0_50 for 0 students', () => {
    expect(requiredTierForCount(0)).toBe('TIER_0_50');
  });

  it('should return TIER_0_50 for 50 students', () => {
    expect(requiredTierForCount(50)).toBe('TIER_0_50');
  });

  it('should return TIER_51_100 for 51 students', () => {
    expect(requiredTierForCount(51)).toBe('TIER_51_100');
  });

  it('should return TIER_51_100 for 100 students', () => {
    expect(requiredTierForCount(100)).toBe('TIER_51_100');
  });

  it('should return TIER_101_PLUS for 101 students', () => {
    expect(requiredTierForCount(101)).toBe('TIER_101_PLUS');
  });

  it('should return TIER_101_PLUS for 500 students', () => {
    expect(requiredTierForCount(500)).toBe('TIER_101_PLUS');
  });
});

describe('computePendingTierChange', () => {
  const paidEndAt = new Date('2025-09-30T23:59:59Z');
  const expectedEffective = new Date(paidEndAt.getTime() + DAY_MS);

  it('should return null when currentTierKey is null', () => {
    expect(computePendingTierChange(null, 'TIER_0_50', paidEndAt)).toBeNull();
  });

  it('should return null when paidEndAt is null', () => {
    expect(computePendingTierChange('TIER_0_50', 'TIER_51_100', null)).toBeNull();
  });

  it('should return null when tiers match', () => {
    expect(computePendingTierChange('TIER_0_50', 'TIER_0_50', paidEndAt)).toBeNull();
  });

  it('should return pending change when upgrade is needed', () => {
    const result = computePendingTierChange('TIER_0_50', 'TIER_51_100', paidEndAt);
    expect(result).toEqual({
      tierKey: 'TIER_51_100',
      effectiveAt: expectedEffective,
    });
  });

  it('should return pending change for downgrade', () => {
    const result = computePendingTierChange('TIER_101_PLUS', 'TIER_0_50', paidEndAt);
    expect(result).toEqual({
      tierKey: 'TIER_0_50',
      effectiveAt: expectedEffective,
    });
  });
});

describe('TIER_TABLE', () => {
  it('should have 3 tiers', () => {
    expect(TIER_TABLE).toHaveLength(3);
  });

  it('should have correct tier keys', () => {
    expect(TIER_TABLE.map((t) => t.tierKey)).toEqual(['TIER_0_50', 'TIER_51_100', 'TIER_101_PLUS']);
  });

  it('TIER_101_PLUS should have null max', () => {
    expect(TIER_TABLE[2]!.max).toBeNull();
  });
});
