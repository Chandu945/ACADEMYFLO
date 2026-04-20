import { Injectable } from '@nestjs/common';
import { CacheService } from '@infrastructure/cache/cache.service';

export const OTP_ATTEMPT_TRACKER = Symbol('OTP_ATTEMPT_TRACKER');

/**
 * Tracks password-reset OTP-confirmation failures per email, across
 * multiple challenges. Prevents an attacker from cycling through new
 * challenges (each with its own small per-challenge cap) to brute-force
 * the 6-digit OTP of a single account.
 */
export interface OtpAttemptTrackerPort {
  isLocked(email: string): Promise<boolean>;
  recordFailure(email: string): Promise<void>;
  recordSuccess(email: string): Promise<void>;
}

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
}

const MAX_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const CACHE_TTL_SECONDS = Math.ceil(LOCKOUT_DURATION_MS / 1000) + 60;
const CACHE_KEY_PREFIX = 'otp-attempt:';

@Injectable()
export class OtpAttemptTracker implements OtpAttemptTrackerPort {
  constructor(private readonly cacheService: CacheService) {}

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

  async recordSuccess(email: string): Promise<void> {
    await this.cacheService.del(`${CACHE_KEY_PREFIX}${email.toLowerCase()}`);
  }
}
