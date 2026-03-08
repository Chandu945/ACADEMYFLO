import { JobLockService } from './job-lock.service';
import type { MongoJobLockRepository } from './mongo-job-lock.repository';
import type { LoggerPort } from '@shared/logging/logger.port';

function mockLogger(): LoggerPort {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
}

function mockRepo(overrides: Partial<MongoJobLockRepository> = {}): MongoJobLockRepository {
  return {
    tryAcquire: jest.fn().mockResolvedValue(true),
    release: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as MongoJobLockRepository;
}

describe('JobLockService', () => {
  it('acquires lock and runs function', async () => {
    const repo = mockRepo();
    const logger = mockLogger();
    const service = new JobLockService(repo, logger);
    const fn = jest.fn().mockResolvedValue(undefined);

    const result = await service.withLock('test-job', 60_000, fn);

    expect(result.ran).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(repo.tryAcquire).toHaveBeenCalledWith('test-job', 60_000, expect.any(String));
    expect(repo.release).toHaveBeenCalledWith('test-job', expect.any(String));
    expect(logger.info).toHaveBeenCalledWith('jobRunStart', expect.any(Object));
    expect(logger.info).toHaveBeenCalledWith('jobRunEnd', expect.any(Object));
  });

  it('skips when lock not acquired', async () => {
    const repo = mockRepo({ tryAcquire: jest.fn().mockResolvedValue(false) });
    const logger = mockLogger();
    const service = new JobLockService(repo, logger);
    const fn = jest.fn();

    const result = await service.withLock('test-job', 60_000, fn);

    expect(result.ran).toBe(false);
    expect(fn).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('jobSkippedLockNotAcquired', expect.any(Object));
  });

  it('releases lock even when function throws', async () => {
    const repo = mockRepo();
    const logger = mockLogger();
    const service = new JobLockService(repo, logger);
    const fn = jest.fn().mockRejectedValue(new Error('boom'));

    await expect(service.withLock('test-job', 60_000, fn)).rejects.toThrow('boom');
    expect(repo.release).toHaveBeenCalled();
  });

  it('logs error when release fails but does not throw', async () => {
    const repo = mockRepo({
      release: jest.fn().mockRejectedValue(new Error('release failed')),
    });
    const logger = mockLogger();
    const service = new JobLockService(repo, logger);
    const fn = jest.fn().mockResolvedValue(undefined);

    const result = await service.withLock('test-job', 60_000, fn);

    expect(result.ran).toBe(true);
    expect(logger.error).toHaveBeenCalledWith(
      'jobLockReleaseFailed',
      expect.objectContaining({ error: 'release failed' }),
    );
  });
});
