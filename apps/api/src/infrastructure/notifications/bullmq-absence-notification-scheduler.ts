import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { AppConfigService } from '@shared/config/config.service';
import type {
  AbsenceNotificationSchedulerPort,
  AbsenceMark,
} from '@application/notifications/ports/absence-notification-scheduler.port';

/** BullMQ job name (single shape for the absence-notifications queue). */
export const ABSENCE_NOTIFY_JOB = 'send-absence-notification';
/** BullMQ queue name. */
export const ABSENCE_NOTIFY_QUEUE = 'absence-notifications';

/** Job payload — mirrors AbsenceMark exactly. */
export type AbsenceNotificationJobData = AbsenceMark;

function jobIdFor(mark: AbsenceMark): string {
  return `absence:${mark.academyId}:${mark.studentId}:${mark.batchId}:${mark.date}`;
}

@Injectable()
export class BullMqAbsenceNotificationScheduler
  implements AbsenceNotificationSchedulerPort, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(BullMqAbsenceNotificationScheduler.name);
  private queue: Queue | null = null;

  constructor(private readonly config: AppConfigService) {}

  async onModuleInit() {
    const redisUrl = this.config.redisUrl;
    if (!redisUrl) {
      // Notifications are advisory; without Redis we degrade gracefully and
      // the attendance write still succeeds on every code path.
      this.logger.warn('No REDIS_URL — absence notifications disabled');
      return;
    }

    try {
      const { Queue } = await import('bullmq');
      this.queue = new Queue(ABSENCE_NOTIFY_QUEUE, {
        connection: { url: redisUrl },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2_000 },
          // Drop completed jobs aggressively — 1h/key cardinality keeps the
          // index lean. Keep failed jobs longer for ops visibility.
          removeOnComplete: { count: 200 },
          removeOnFail: { count: 1_000 },
        },
      });
      this.logger.log(`BullMQ queue '${ABSENCE_NOTIFY_QUEUE}' initialized`);
    } catch (e) {
      this.logger.error(
        `Absence-notification scheduler init failed: ${e instanceof Error ? e.message : 'unknown'}`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.queue) await this.queue.close();
  }

  async schedule(mark: AbsenceMark): Promise<void> {
    const jobId = jobIdFor(mark);
    if (!this.queue) {
      // Redis unavailable — log and proceed. The caller already wraps this
      // in try/catch so the attendance write never observes the failure.
      this.logger.warn(`absence-notif: schedule skipped (queue unavailable) [${jobId}]`);
      return;
    }
    // First-wins: if a job with this id is already in the queue, BullMQ
    // returns the existing one and ignores the add. This is exactly the
    // dedup we want for double-tap ABSENT.
    await this.queue.add(ABSENCE_NOTIFY_JOB, mark satisfies AbsenceNotificationJobData, {
      jobId,
      delay: this.config.absenceNotifyDelayMs,
    });
  }

  async cancel(mark: AbsenceMark): Promise<void> {
    const jobId = jobIdFor(mark);
    if (!this.queue) {
      this.logger.warn(`absence-notif: cancel skipped (queue unavailable) [${jobId}]`);
      return;
    }
    const job = await this.queue.getJob(jobId);
    if (job) {
      // Idempotent: removing a non-existent or already-removed job is a no-op.
      await job.remove();
    }
  }
}
