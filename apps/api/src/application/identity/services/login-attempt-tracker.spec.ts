import { LoginAttemptTracker } from './login-attempt-tracker';
import type { CacheService } from '@infrastructure/cache/cache.service';

describe('LoginAttemptTracker', () => {
  let tracker: LoginAttemptTracker;
  let mockCacheService: jest.Mocked<Pick<CacheService, 'get' | 'set' | 'del'>>;

  beforeEach(() => {
    mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    tracker = new LoginAttemptTracker(mockCacheService as unknown as CacheService);
  });

  it('should not be locked initially', async () => {
    expect(await tracker.isLocked('user@test.com')).toBe(false);
  });

  it('should not lock after fewer than 10 failed attempts', async () => {
    for (let i = 0; i < 9; i++) {
      mockCacheService.get.mockResolvedValue({ count: i, lockedUntil: null });
      await tracker.recordFailure('user@test.com');
    }
    mockCacheService.get.mockResolvedValue({ count: 9, lockedUntil: null });
    expect(await tracker.isLocked('user@test.com')).toBe(false);
  });

  it('should lock after 10 failed attempts', async () => {
    const lockedUntil = Date.now() + 15 * 60 * 1000;
    mockCacheService.get.mockResolvedValue({ count: 10, lockedUntil });
    expect(await tracker.isLocked('user@test.com')).toBe(true);
  });

  it('should be case-insensitive on email', async () => {
    // Record failures via upper case
    mockCacheService.get.mockResolvedValue(null);
    await tracker.recordFailure('User@Test.COM');

    // Verify the cache key was normalized to lowercase
    expect(mockCacheService.set).toHaveBeenCalledWith(
      'login-attempt:user@test.com',
      expect.objectContaining({ count: 1 }),
      expect.any(Number),
    );
  });

  it('should reset on successful login', async () => {
    await tracker.recordSuccess('user@test.com');
    expect(mockCacheService.del).toHaveBeenCalledWith('login-attempt:user@test.com');
  });

  it('should unlock after lockout period expires', async () => {
    // Lockout has already expired
    const expiredLockout = Date.now() - 1000;
    mockCacheService.get.mockResolvedValue({ count: 10, lockedUntil: expiredLockout });

    expect(await tracker.isLocked('user@test.com')).toBe(false);
    expect(mockCacheService.del).toHaveBeenCalledWith('login-attempt:user@test.com');
  });

  it('should not affect other accounts', async () => {
    const lockedUntil = Date.now() + 15 * 60 * 1000;

    // locked@test.com is locked
    mockCacheService.get.mockImplementation(async (key: string) => {
      if (key === 'login-attempt:locked@test.com') {
        return { count: 10, lockedUntil };
      }
      return null;
    });

    expect(await tracker.isLocked('locked@test.com')).toBe(true);
    expect(await tracker.isLocked('other@test.com')).toBe(false);
  });

  it('should set lockedUntil when count reaches MAX_ATTEMPTS', async () => {
    // Simulate 9 previous attempts
    mockCacheService.get.mockResolvedValue({ count: 9, lockedUntil: null });
    await tracker.recordFailure('user@test.com');

    expect(mockCacheService.set).toHaveBeenCalledWith(
      'login-attempt:user@test.com',
      expect.objectContaining({
        count: 10,
        lockedUntil: expect.any(Number),
      }),
      expect.any(Number),
    );
  });
});
