import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import type { Worker } from 'bullmq';
import { AppConfigService } from '@shared/config/config.service';
import type { SendAbsenceNotificationUseCase } from '@application/notifications/use-cases/send-absence-notification.usecase';
import {
  ABSENCE_NOTIFY_QUEUE,
  type AbsenceNotificationJobData,
} from '@infrastructure/notifications/bullmq-absence-notification-scheduler';

export const SEND_ABSENCE_NOTIFICATION_USE_CASE = 'SEND_ABSENCE_NOTIFICATION_USE_CASE';

@Injectable()
export class AbsenceNotificationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AbsenceNotificationProcessor.name);
  private worker: Worker | null = null;

  constructor(
    private readonly config: AppConfigService,
    @Inject(SEND_ABSENCE_NOTIFICATION_USE_CASE)
    private readonly useCase: SendAbsenceNotificationUseCase,
  ) {}

  async onModuleInit() {
    const redisUrl = this.config.redisUrl;
    if (!redisUrl) return;

    try {
      const { Worker } = await import('bullmq');
      this.worker = new Worker(
        ABSENCE_NOTIFY_QUEUE,
        async (job) => {
          const data = job.data as AbsenceNotificationJobData;
          // Re-checks live in the use-case — every state change (holiday,
          // student status, parent unlink, toggle-back) is observed fresh
          // from the DB at firing, so no upstream cancellation is required.
          await this.useCase.execute(data);
        },
        {
          connection: { url: redisUrl },
          // Low concurrency: each job fans out to one parent batch's worth
          // of devices. Higher concurrency would only matter at very large
          // tenants and would make Mongo read-pressure spikier.
          concurrency: 5,
        },
      );

      this.worker.on('failed', (job, err) => {
        this.logger.error(`Absence-notification job ${job?.id} failed: ${err.message}`, err.stack);
      });

      this.logger.log('Absence-notification worker started (concurrency: 5)');
    } catch (e) {
      // error, not warn: if the worker fails to start, jobs the scheduler
      // is still adding will pile up and never get processed. That's a
      // page-the-team situation, not a "noted" warning.
      this.logger.error(
        `Absence-notification worker init failed: ${e instanceof Error ? e.message : 'unknown'}`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.worker) await this.worker.close();
  }
}
