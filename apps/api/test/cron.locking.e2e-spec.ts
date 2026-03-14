import { JobLockService } from '../src/infrastructure/reliability/job-lock/job-lock.service';
import type { MongoJobLockRepository } from '../src/infrastructure/reliability/job-lock/mongo-job-lock.repository';
import type { LoggerPort } from '../src/shared/logging/logger.port';

function mockLogger(): LoggerPort {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
}

/**
 * Simulates two instances competing for the same cron lock.
 * Uses an in-memory lock store instead of Mongo for E2E-like behavior
 * without requiring a database connection.
 */
class InMemoryJobLockRepository {
  private locks = new Map<string, { lockedUntil: Date; lockedBy: string }>();

  async tryAcquire(jobName: string, ttlMs: number, instanceId: string): Promise<boolean> {
    const now = new Date();
    const existing = this.locks.get(jobName);

    if (existing && existing.lockedUntil > now) {
      return false; // Lock is held
    }

    this.locks.set(jobName, {
      lockedUntil: new Date(now.getTime() + ttlMs),
      lockedBy: instanceId,
    });

    return true;
  }

  async release(jobName: string, instanceId: string): Promise<void> {
    const existing = this.locks.get(jobName);
    if (existing && existing.lockedBy === instanceId) {
      this.locks.set(jobName, {
        ...existing,
        lockedUntil: new Date(0),
      });
    }
  }
}

describe('Cron Locking (E2E simulation)', () => {
  it('instance A acquires lock and runs; instance B skips', async () => {
    const repo = new InMemoryJobLockRepository();
    const loggerA = mockLogger();
    const loggerB = mockLogger();

    const serviceA = new JobLockService(
      repo as unknown as MongoJobLockRepository,
      loggerA,
    );
    const serviceB = new JobLockService(
      repo as unknown as MongoJobLockRepository,
      loggerB,
    );

    const fnA = jest.fn().mockResolvedValue(undefined);
    const fnB = jest.fn().mockResolvedValue(undefined);

    // A acquires first
    const resultA = await serviceA.withLock('test-cron', 60_000, fnA);

    // B tries while A's lock is active
    const resultB = await serviceB.withLock('test-cron', 60_000, fnB);

    expect(resultA.ran).toBe(true);
    expect(fnA).toHaveBeenCalledTimes(1);
    expect(loggerA.info).toHaveBeenCalledWith('jobRunStart', expect.any(Object));
    expect(loggerA.info).toHaveBeenCalledWith('jobRunEnd', expect.any(Object));

    expect(resultB.ran).toBe(false);
    expect(fnB).not.toHaveBeenCalled();
    expect(loggerB.info).toHaveBeenCalledWith('jobSkippedLockNotAcquired', expect.any(Object));
  });

  it('lock can be reacquired after release', async () => {
    const repo = new InMemoryJobLockRepository();
    const logger = mockLogger();
    const service = new JobLockService(
      repo as unknown as MongoJobLockRepository,
      logger,
    );

    const fn1 = jest.fn().mockResolvedValue(undefined);
    const fn2 = jest.fn().mockResolvedValue(undefined);

    // First run completes and releases
    const result1 = await service.withLock('test-cron', 60_000, fn1);
    expect(result1.ran).toBe(true);

    // Second run can acquire after release
    const result2 = await service.withLock('test-cron', 60_000, fn2);
    expect(result2.ran).toBe(true);
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('lock expires after TTL and can be reacquired by another instance', async () => {
    const repo = new InMemoryJobLockRepository();
    const loggerA = mockLogger();
    const loggerB = mockLogger();

    const serviceA = new JobLockService(
      repo as unknown as MongoJobLockRepository,
      loggerA,
    );
    const serviceB = new JobLockService(
      repo as unknown as MongoJobLockRepository,
      loggerB,
    );

    // A acquires lock with very short TTL
    const fnA = jest.fn().mockImplementation(async () => {
      // Simulate: lock was acquired but instance crashed (no release)
    });
    await serviceA.withLock('expiry-cron', 1, fnA); // 1ms TTL

    // Small delay to ensure TTL has expired
    await new Promise((r) => setTimeout(r, 10));

    // B can now acquire the expired lock
    const fnB = jest.fn().mockResolvedValue(undefined);
    const resultB = await serviceB.withLock('expiry-cron', 60_000, fnB);

    expect(resultB.ran).toBe(true);
    expect(fnB).toHaveBeenCalledTimes(1);
  });

  it('concurrent lock attempts produce at most one winner', async () => {
    const repo = new InMemoryJobLockRepository();

    const services = Array.from({ length: 5 }, () => {
      return new JobLockService(
        repo as unknown as MongoJobLockRepository,
        mockLogger(),
      );
    });

    const fns = services.map(() => jest.fn().mockResolvedValue(undefined));

    const results = await Promise.all(
      services.map((svc, i) => svc.withLock('concurrent-cron', 60_000, fns[i]!)),
    );

    const ranCount = results.filter((r) => r.ran).length;
    const skippedCount = results.filter((r) => !r.ran).length;

    expect(ranCount).toBe(1);
    expect(skippedCount).toBe(4);

    const totalCalls = fns.reduce((sum, fn) => sum + fn.mock.calls.length, 0);
    expect(totalCalls).toBe(1);
  });
});
