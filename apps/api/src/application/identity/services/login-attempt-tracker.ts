import { Injectable } from '@nestjs/common';
import { CacheService } from '@infrastructure/cache/cache.service';

export const LOGIN_ATTEMPT_TRACKER = Symbol('LOGIN_ATTEMPT_TRACKER');

/**
 * Port interface for login attempt tracking.
 * Implementations must be injectable via LOGIN_ATTEMPT_TRACKER token.
 *
 * All methods are async to support Redis-backed storage for
 * horizontal scaling across multiple API instances.
 */
export interface LoginAttemptTrackerPort {
  isLocked(email: string): Promise<boolean>;
  recordFailure(email: string): Promise<void>;
  recordSuccess(email: string): Promise<void>;
}

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
}

const MAX_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
/** TTL for cache entries: lockout duration + 60s buffer */
const CACHE_TTL_SECONDS = Math.ceil(LOCKOUT_DURATION_MS / 1000) + 60;
const CACHE_KEY_PREFIX = 'login-attempt:';

/**
 * Redis-backed login attempt tracker.
 *
 * Uses CacheService (which falls back to in-memory if Redis is unavailable)
 * to share lockout state across all horizontally scaled API instances.
 */
@Injectable()
export class LoginAttemptTracker implements LoginAttemptTrackerPort {
  constructor(private readonly cacheService: CacheService) {}

  /**
   * Returns true if the account is currently locked out.
   */
  async isLocked(email: string): Promise<boolean> {
    const cacheKey = `${CACHE_KEY_PREFIX}${email.toLowerCase()}`;
    const record = await this.cacheService.get<AttemptRecord>(cacheKey);
    if (!record?.lockedUntil) return false;
    if (Date.now() > record.lockedUntil) {
      await this.cacheService.del(cacheKey);
      return false;
    }
    return true;
  }

  /**
   * Record a failed login attempt. Locks the account after MAX_ATTEMPTS failures.
   */
  async recordFailure(email: string): Promise<void> {
    const cacheKey = `${CACHE_KEY_PREFIX}${email.toLowerCase()}`;
    const existing = await this.cacheService.get<AttemptRecord>(cacheKey);
    const record: AttemptRecord = existing ?? { count: 0, lockedUntil: null };
    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    }
    await this.cacheService.set(cacheKey, record, CACHE_TTL_SECONDS);
  }

  /**
   * Reset attempt counter on successful login.
   */
  async recordSuccess(email: string): Promise<void> {
    await this.cacheService.del(`${CACHE_KEY_PREFIX}${email.toLowerCase()}`);
  }
}
