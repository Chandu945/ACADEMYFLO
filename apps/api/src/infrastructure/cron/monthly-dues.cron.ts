import { Injectable, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import { ACADEMY_REPOSITORY } from '@domain/academy/ports/academy.repository';
import { RunMonthlyDuesEngineUseCase } from '@application/fee/use-cases/run-monthly-dues-engine.usecase';
import type { AuditRecorderPort } from '@application/audit/ports/audit-recorder.port';
import { AUDIT_RECORDER_PORT } from '@application/audit/ports/audit-recorder.port';
import type { JobLockPort } from '@application/common/ports/job-lock.port';
import { JOB_LOCK_PORT } from '@application/common/ports/job-lock.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import { LOGGER_PORT } from '@shared/logging/logger.port';

const LOCK_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

@Injectable()
export class MonthlyDuesCronService {
  constructor(
    @Inject(ACADEMY_REPOSITORY)
    private readonly academyRepo: AcademyRepository,
    @Inject('RUN_MONTHLY_DUES_ENGINE_USE_CASE')
    private readonly engine: RunMonthlyDuesEngineUseCase,
    @Inject(AUDIT_RECORDER_PORT)
    private readonly auditRecorder: AuditRecorderPort,
    @Inject(JOB_LOCK_PORT)
    private readonly jobLock: JobLockPort,
    @Inject(LOGGER_PORT)
    private readonly logger: LoggerPort,
  ) {}

  @Cron('10 0 * * *', { timeZone: 'Asia/Kolkata' })
  async handleDuesGeneration(): Promise<void> {
    await this.jobLock.withLock('monthly-dues', LOCK_TTL_MS, async () => {
      const now = new Date();
      const academyIds = await this.academyRepo.findAllIds();

      let totalCreated = 0;
      let totalFlipped = 0;

      for (const academyId of academyIds) {
        const result = await this.engine.execute({ academyId, now });
        if (result.ok) {
          totalCreated += result.value.created;
          totalFlipped += result.value.flippedToDue;
          await this.auditRecorder.record({
            academyId,
            actorUserId: 'SYSTEM',
            action: 'MONTHLY_DUES_ENGINE_RAN',
            entityType: 'FEE_DUE',
            entityId: academyId,
            context: {
              created: String(result.value.created),
              flippedToDue: String(result.value.flippedToDue),
            },
          });
        }
      }

      this.logger.info('Monthly dues cron completed', {
        academyCount: academyIds.length,
        totalCreated,
        totalFlipped,
      });
    });
  }
}
