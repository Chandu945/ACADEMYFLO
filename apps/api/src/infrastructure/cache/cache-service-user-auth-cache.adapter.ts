import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';
import type { UserAuthCachePort } from '@application/identity/ports/user-auth-cache.port';

/**
 * Adapter that fulfils UserAuthCachePort using the shared CacheService.
 * Keeps the key layout (`user:auth:{userId}`) in one place so JwtAuthGuard
 * and invalidation stay in lockstep.
 */
@Injectable()
export class CacheServiceUserAuthCacheAdapter implements UserAuthCachePort {
  constructor(private readonly cacheService: CacheService) {}

  async invalidate(userId: string): Promise<void> {
    await this.cacheService.del(`user:auth:${userId}`);
  }

  async invalidateMany(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    await Promise.all(userIds.map((id) => this.invalidate(id)));
  }
}
