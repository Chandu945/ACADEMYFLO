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
      let totalSnapshotted = 0;
      let totalBackfilled = 0;
      let totalFailed = 0;
      const failedAcademyIds: string[] = [];
      const backfilledAcademyIds: string[] = [];

      for (const academyId of academyIds) {
        // Per-academy try/catch: one corrupt student record (or a transient
        // DB error) must not poison the rest of the run. Without this,
        // a thrown exception unwinds the for-loop and the remaining
        // academies silently miss their dues generation for the day —
        // exactly the failure mode H2 fixes.
        try {
          const result = await this.engine.execute({ academyId, now });
          if (result.ok) {
            totalCreated += result.value.created;
            totalFlipped += result.value.flippedToDue;
            totalSnapshotted += result.value.snapshotted;
            totalBackfilled += result.value.backfilled;
            if (result.value.backfilled > 0) {
              backfilledAcademyIds.push(academyId);
            }

            // M4 fix: skip the audit entry when nothing changed. The cron
            // runs daily, but for most academies most days nothing happens
            // (dues already created, not a flip day, no backfill needed).
            // Recording an audit row for every no-op buries the real events
            // — owners reviewing their audit log see ~94% noise. The
            // per-run telemetry stays in the structured `cron completed`
            // log below, which still fires every run.
            const hasStateChange =
              result.value.created +
                result.value.flippedToDue +
                result.value.snapshotted +
                result.value.backfilled >
              0;
            if (hasStateChange) {
              await this.auditRecorder.record({
                academyId,
                actorUserId: 'SYSTEM',
                action: 'MONTHLY_DUES_ENGINE_RAN',
                entityType: 'FEE_DUE',
                entityId: academyId,
                context: {
                  created: String(result.value.created),
                  flippedToDue: String(result.value.flippedToDue),
                  snapshotted: String(result.value.snapshotted),
                  backfilled: String(result.value.backfilled),
                },
              });
            }
          } else {
            // Result-err path. Today the engine doesn't return err for any
            // known case, but log defensively so future error returns
            // surface here too.
            totalFailed++;
            failedAcademyIds.push(academyId);
            this.logger.error('Monthly dues failed (result err)', {
              academyId,
              errorCode: result.error.code,
              errorMessage: result.error.message,
            });
          }
        } catch (e) {
          // Thrown path — corrupt data, repo error, schema validation, etc.
          // Logged at error level with structured context so ops can find
          // and remediate the offending academy.
          totalFailed++;
          failedAcademyIds.push(academyId);
          this.logger.error('Monthly dues threw', {
            academyId,
            error: e instanceof Error ? e.message : 'unknown',
            stack: e instanceof Error ? e.stack : undefined,
          });
        }
      }

      this.logger.info('Monthly dues cron completed', {
        academyCount: academyIds.length,
        totalCreated,
        totalFlipped,
        totalSnapshotted,
        totalBackfilled,
        totalFailed,
        // Cap the lists at 50 so the log line stays readable on platforms
        // with line-length limits. If counts > 50, ops can grep for the
        // per-academy logs instead.
        failedAcademyIds: failedAcademyIds.slice(0, 50),
        // backfilledAcademyIds being non-empty is a signal worth alerting
        // on — it means M2's safety net caught a real cron skip.
        backfilledAcademyIds: backfilledAcademyIds.slice(0, 50),
      });
    });
  }
}
