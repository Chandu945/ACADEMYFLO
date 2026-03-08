import { evaluateSubscriptionStatus } from './subscription.rules';
import { Subscription } from '../entities/subscription.entity';
import { createAuditFields } from '@shared/kernel';

const DAY_MS = 24 * 60 * 60 * 1000;

function createSub(overrides?: {
  trialStartAt?: Date;
  trialEndAt?: Date;
  paidStartAt?: Date | null;
  paidEndAt?: Date | null;
}): Subscription {
  const now = new Date();
  return Subscription.reconstitute('sub-1', {
    academyId: 'academy-1',
    trialStartAt: overrides?.trialStartAt ?? now,
    trialEndAt: overrides?.trialEndAt ?? new Date(now.getTime() + 30 * DAY_MS),
    paidStartAt: overrides?.paidStartAt ?? null,
    paidEndAt: overrides?.paidEndAt ?? null,
    tierKey: null,
    pendingTierKey: null,
    pendingTierEffectiveAt: null,
    activeStudentCountSnapshot: null,
    manualNotes: null,
    paymentReference: null,
    audit: createAuditFields(),
  });
}

describe('evaluateSubscriptionStatus', () => {
  it('should return TRIAL when within trial period (no paid)', () => {
    const now = new Date();
    const sub = createSub({
      trialStartAt: now,
      trialEndAt: new Date(now.getTime() + 15 * DAY_MS),
    });

    const result = evaluateSubscriptionStatus(now, false, sub);

    expect(result.status).toBe('TRIAL');
    expect(result.canAccessApp).toBe(true);
    expect(result.daysRemaining).toBe(15);
    expect(result.blockReason).toBeNull();
  });

  it('should return ACTIVE_PAID when within paid period', () => {
    const now = new Date();
    const sub = createSub({
      trialEndAt: new Date(now.getTime() - 10 * DAY_MS), // trial expired
      paidStartAt: new Date(now.getTime() - 5 * DAY_MS),
      paidEndAt: new Date(now.getTime() + 25 * DAY_MS),
    });

    const result = evaluateSubscriptionStatus(now, false, sub);

    expect(result.status).toBe('ACTIVE_PAID');
    expect(result.canAccessApp).toBe(true);
    expect(result.daysRemaining).toBe(25);
  });

  it('should return EXPIRED_GRACE within 3 days after paid expiry', () => {
    const now = new Date();
    const sub = createSub({
      trialEndAt: new Date(now.getTime() - 30 * DAY_MS),
      paidStartAt: new Date(now.getTime() - 30 * DAY_MS),
      paidEndAt: new Date(now.getTime() - 1 * DAY_MS), // expired 1 day ago
    });

    const result = evaluateSubscriptionStatus(now, false, sub);

    expect(result.status).toBe('EXPIRED_GRACE');
    expect(result.canAccessApp).toBe(true);
    expect(result.daysRemaining).toBe(2); // 3 - 1 = 2 days left
  });

  it('should return BLOCKED after trial expired with no paid', () => {
    const now = new Date();
    const sub = createSub({
      trialStartAt: new Date(now.getTime() - 40 * DAY_MS),
      trialEndAt: new Date(now.getTime() - 10 * DAY_MS),
    });

    const result = evaluateSubscriptionStatus(now, false, sub);

    expect(result.status).toBe('BLOCKED');
    expect(result.canAccessApp).toBe(false);
    expect(result.daysRemaining).toBe(0);
    expect(result.blockReason).toBeTruthy();
  });

  it('should return BLOCKED after grace period expires', () => {
    const now = new Date();
    const sub = createSub({
      trialEndAt: new Date(now.getTime() - 60 * DAY_MS),
      paidStartAt: new Date(now.getTime() - 40 * DAY_MS),
      paidEndAt: new Date(now.getTime() - 5 * DAY_MS), // expired 5 days ago (> 3 grace)
    });

    const result = evaluateSubscriptionStatus(now, false, sub);

    expect(result.status).toBe('BLOCKED');
    expect(result.canAccessApp).toBe(false);
  });

  it('should return DISABLED when academy login is disabled', () => {
    const now = new Date();
    const sub = createSub({
      trialEndAt: new Date(now.getTime() + 15 * DAY_MS),
    });

    const result = evaluateSubscriptionStatus(now, true, sub);

    expect(result.status).toBe('DISABLED');
    expect(result.canAccessApp).toBe(false);
    expect(result.blockReason).toContain('disabled');
  });

  it('DISABLED should override ACTIVE_PAID', () => {
    const now = new Date();
    const sub = createSub({
      paidStartAt: new Date(now.getTime() - 5 * DAY_MS),
      paidEndAt: new Date(now.getTime() + 25 * DAY_MS),
    });

    const result = evaluateSubscriptionStatus(now, true, sub);

    expect(result.status).toBe('DISABLED');
    expect(result.canAccessApp).toBe(false);
  });

  it('ACTIVE_PAID should override TRIAL', () => {
    const now = new Date();
    const sub = createSub({
      trialEndAt: new Date(now.getTime() + 10 * DAY_MS), // trial still active
      paidStartAt: now,
      paidEndAt: new Date(now.getTime() + 365 * DAY_MS),
    });

    const result = evaluateSubscriptionStatus(now, false, sub);

    expect(result.status).toBe('ACTIVE_PAID');
  });
});
