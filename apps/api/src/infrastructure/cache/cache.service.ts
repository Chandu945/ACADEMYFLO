import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { AppConfigService } from '@shared/config/config.service';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly store = new Map<string, { value: string; expiresAt: number }>();
  private redis: Redis | null = null;
  private defaultTtl: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private readonly MAX_MEMORY_ENTRIES = 10_000;

  constructor(private readonly configService: AppConfigService) {
    this.defaultTtl = this.configService.cacheTtlSeconds;
  }

  async onModuleInit() {
    const redisUrl = this.configService.redisUrl;

    if (redisUrl) {
      try {
        const { default: Redis } = await import('ioredis');
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => Math.min(times * 200, 2000),
          lazyConnect: true,
          enableReadyCheck: true,
        });
        await this.redis.connect();
        this.logger.log('Redis cache connected');
      } catch (error) {
        this.logger.warn(
          `Redis unavailable, using in-memory cache: ${error instanceof Error ? error.message : 'unknown'}`,
        );
        this.redis = null;
      }
    } else {
      this.logger.log('No REDIS_URL configured, using in-memory cache');
    }

    // Cleanup expired in-memory entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 60_000);
  }

  async onModuleDestroy() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        /* ignore */
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redis) {
        const val = await this.redis.get(key);
        return val ? (JSON.parse(val) as T) : null;
      }
      const entry = this.store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        this.store.delete(key);
        return null;
      }
      return JSON.parse(entry.value) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtl;
    const serialized = JSON.stringify(value);
    try {
      if (this.redis) {
        await this.redis.setex(key, ttl, serialized);
        return;
      }
      if (this.store.size >= this.MAX_MEMORY_ENTRIES) {
        this.evictOldest();
      }
      this.store.set(key, {
        value: serialized,
        expiresAt: Date.now() + ttl * 1000,
      });
    } catch {
      // Swallow cache write errors — cache is best-effort
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key);
        return;
      }
      this.store.delete(key);
    } catch {
      // Swallow cache delete errors
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    try {
      if (this.redis) {
        const stream = this.redis.scanStream({ match: `${prefix}*`, count: 100 });
        const pipeline = this.redis.pipeline();
        let count = 0;
        await new Promise<void>((resolve, reject) => {
          stream.on('data', (keys: string[]) => {
            for (const key of keys) { pipeline.del(key); count++; }
          });
          stream.on('end', () => { if (count > 0) pipeline.exec().then(() => resolve()).catch(reject); else resolve(); });
          stream.on('error', reject);
        });
        return;
      }
      for (const key of this.store.keys()) {
        if (key.startsWith(prefix)) this.store.delete(key);
      }
    } catch {
      // Swallow
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }

  private evictOldest(): void {
    const first = this.store.keys().next();
    if (!first.done) this.store.delete(first.value);
  }
}
