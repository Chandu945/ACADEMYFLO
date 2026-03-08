import { PasswordResetChallenge } from './password-reset-challenge.entity';

describe('PasswordResetChallenge', () => {
  function createChallenge(overrides: Partial<{
    expiresAt: Date;
    attempts: number;
    maxAttempts: number;
    usedAt: Date | null;
  }> = {}): PasswordResetChallenge {
    return PasswordResetChallenge.create({
      id: 'challenge-1',
      userId: 'user-1',
      otpHash: 'hash-abc',
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 10 * 60 * 1000),
      maxAttempts: overrides.maxAttempts ?? 5,
    });
  }

  it('should create with defaults (attempts=0, usedAt=null)', () => {
    const challenge = createChallenge();
    expect(challenge.attempts).toBe(0);
    expect(challenge.usedAt).toBeNull();
    expect(challenge.userId).toBe('user-1');
    expect(challenge.otpHash).toBe('hash-abc');
    expect(challenge.maxAttempts).toBe(5);
  });

  it('isExpired() returns true when past expiresAt', () => {
    const challenge = PasswordResetChallenge.reconstitute('c-1', {
      userId: 'user-1',
      otpHash: 'hash',
      expiresAt: new Date(Date.now() - 1000),
      attempts: 0,
      maxAttempts: 5,
      usedAt: null,
      createdAt: new Date(Date.now() - 60000),
    });
    expect(challenge.isExpired()).toBe(true);
  });

  it('isExpired() returns false when before expiresAt', () => {
    const challenge = createChallenge();
    expect(challenge.isExpired()).toBe(false);
  });

  it('isUsed() returns true when usedAt is set', () => {
    const challenge = PasswordResetChallenge.reconstitute('c-1', {
      userId: 'user-1',
      otpHash: 'hash',
      expiresAt: new Date(Date.now() + 60000),
      attempts: 0,
      maxAttempts: 5,
      usedAt: new Date(),
      createdAt: new Date(),
    });
    expect(challenge.isUsed()).toBe(true);
  });

  it('isUsed() returns false when usedAt is null', () => {
    const challenge = createChallenge();
    expect(challenge.isUsed()).toBe(false);
  });

  it('hasExceededAttempts() returns true when attempts >= maxAttempts', () => {
    const challenge = PasswordResetChallenge.reconstitute('c-1', {
      userId: 'user-1',
      otpHash: 'hash',
      expiresAt: new Date(Date.now() + 60000),
      attempts: 5,
      maxAttempts: 5,
      usedAt: null,
      createdAt: new Date(),
    });
    expect(challenge.hasExceededAttempts()).toBe(true);
  });

  it('hasExceededAttempts() returns false when attempts < maxAttempts', () => {
    const challenge = createChallenge();
    expect(challenge.hasExceededAttempts()).toBe(false);
  });

  it('canVerify() returns true when not expired, not used, and not exceeded', () => {
    const challenge = createChallenge();
    expect(challenge.canVerify()).toBe(true);
  });

  it('canVerify() returns false when expired', () => {
    const challenge = PasswordResetChallenge.reconstitute('c-1', {
      userId: 'user-1',
      otpHash: 'hash',
      expiresAt: new Date(Date.now() - 1000),
      attempts: 0,
      maxAttempts: 5,
      usedAt: null,
      createdAt: new Date(),
    });
    expect(challenge.canVerify()).toBe(false);
  });

  it('canVerify() returns false when used', () => {
    const challenge = PasswordResetChallenge.reconstitute('c-1', {
      userId: 'user-1',
      otpHash: 'hash',
      expiresAt: new Date(Date.now() + 60000),
      attempts: 0,
      maxAttempts: 5,
      usedAt: new Date(),
      createdAt: new Date(),
    });
    expect(challenge.canVerify()).toBe(false);
  });

  it('canVerify() returns false when attempts exceeded', () => {
    const challenge = PasswordResetChallenge.reconstitute('c-1', {
      userId: 'user-1',
      otpHash: 'hash',
      expiresAt: new Date(Date.now() + 60000),
      attempts: 5,
      maxAttempts: 5,
      usedAt: null,
      createdAt: new Date(),
    });
    expect(challenge.canVerify()).toBe(false);
  });

  it('reconstitute preserves all props', () => {
    const now = new Date();
    const challenge = PasswordResetChallenge.reconstitute('c-99', {
      userId: 'user-2',
      otpHash: 'hash-xyz',
      expiresAt: now,
      attempts: 3,
      maxAttempts: 10,
      usedAt: now,
      createdAt: now,
    });
    expect(challenge.id.toString()).toBe('c-99');
    expect(challenge.userId).toBe('user-2');
    expect(challenge.otpHash).toBe('hash-xyz');
    expect(challenge.expiresAt).toBe(now);
    expect(challenge.attempts).toBe(3);
    expect(challenge.maxAttempts).toBe(10);
    expect(challenge.usedAt).toBe(now);
    expect(challenge.createdAt).toBe(now);
  });
});
