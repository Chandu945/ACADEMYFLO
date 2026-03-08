import { evaluateAcademyAccess } from './academy-access.rules';

describe('evaluateAcademyAccess', () => {
  it('should return DISABLED when loginDisabled is true regardless of subscription', () => {
    const result = evaluateAcademyAccess({
      loginDisabled: true,
      subscriptionStatus: 'ACTIVE_PAID',
      canAccessAppFromSubscription: true,
    });

    expect(result.canAccessApp).toBe(false);
    expect(result.effectiveStatus).toBe('DISABLED');
    expect(result.blockReason).toContain('disabled by administrator');
  });

  it('should return DISABLED when loginDisabled is true and subscription is TRIAL', () => {
    const result = evaluateAcademyAccess({
      loginDisabled: true,
      subscriptionStatus: 'TRIAL',
      canAccessAppFromSubscription: true,
    });

    expect(result.canAccessApp).toBe(false);
    expect(result.effectiveStatus).toBe('DISABLED');
  });

  it('should return DISABLED when loginDisabled is true and subscription is BLOCKED', () => {
    const result = evaluateAcademyAccess({
      loginDisabled: true,
      subscriptionStatus: 'BLOCKED',
      canAccessAppFromSubscription: false,
    });

    expect(result.canAccessApp).toBe(false);
    expect(result.effectiveStatus).toBe('DISABLED');
  });

  it('should pass through subscription status when loginDisabled is false', () => {
    const result = evaluateAcademyAccess({
      loginDisabled: false,
      subscriptionStatus: 'ACTIVE_PAID',
      canAccessAppFromSubscription: true,
    });

    expect(result.canAccessApp).toBe(true);
    expect(result.effectiveStatus).toBe('ACTIVE_PAID');
    expect(result.blockReason).toBeNull();
  });

  it('should block when subscription blocks and loginDisabled is false', () => {
    const result = evaluateAcademyAccess({
      loginDisabled: false,
      subscriptionStatus: 'BLOCKED',
      canAccessAppFromSubscription: false,
    });

    expect(result.canAccessApp).toBe(false);
    expect(result.effectiveStatus).toBe('BLOCKED');
    expect(result.blockReason).toContain('Subscription expired');
  });

  it('should allow TRIAL when loginDisabled is false', () => {
    const result = evaluateAcademyAccess({
      loginDisabled: false,
      subscriptionStatus: 'TRIAL',
      canAccessAppFromSubscription: true,
    });

    expect(result.canAccessApp).toBe(true);
    expect(result.effectiveStatus).toBe('TRIAL');
  });

  it('should allow EXPIRED_GRACE when loginDisabled is false', () => {
    const result = evaluateAcademyAccess({
      loginDisabled: false,
      subscriptionStatus: 'EXPIRED_GRACE',
      canAccessAppFromSubscription: true,
    });

    expect(result.canAccessApp).toBe(true);
    expect(result.effectiveStatus).toBe('EXPIRED_GRACE');
  });
});
