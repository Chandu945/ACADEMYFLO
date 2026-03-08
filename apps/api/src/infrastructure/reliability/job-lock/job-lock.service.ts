import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { JobLockPort } from '@application/common/ports/job-lock.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import { LOGGER_PORT } from '@shared/logging/logger.port';
import { MongoJobLockRepository } from './mongo-job-lock.repository';

@Injectable()
export class JobLockService implements JobLockPort {
  private readonly instanceId = randomUUID();

  constructor(
    private readonly repo: MongoJobLockRepository,
    @Inject(LOGGER_PORT) private readonly logger: LoggerPort,
  ) {}

  async withLock(
    jobName: string,
    ttlMs: number,
    fn: () => Promise<void>,
  ): Promise<{ ran: boolean }> {
    const acquired = await this.repo.tryAcquire(jobName, ttlMs, this.instanceId);

    if (!acquired) {
      this.logger.info('jobSkippedLockNotAcquired', {
        jobName,
        instanceId: this.instanceId,
      });
      return { ran: false };
    }

    this.logger.info('jobRunStart', { jobName, instanceId: this.instanceId });

    try {
      await fn();
      this.logger.info('jobRunEnd', { jobName, instanceId: this.instanceId });
      return { ran: true };
    } finally {
      await this.repo.release(jobName, this.instanceId).catch((err) => {
        this.logger.error('jobLockReleaseFailed', {
          jobName,
          instanceId: this.instanceId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }
  }
}
