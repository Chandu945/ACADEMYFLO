import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { AppConfigService } from '@shared/config/config.service';
import type { PushNotificationService } from '@application/notifications/push-notification.service';
import { PUSH_NOTIFICATION_SERVICE } from '../../../presentation/http/device-tokens/device-tokens.module';

@Injectable()
export class NotificationQueueProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueProcessor.name);
  private worker: import('bullmq').Worker | null = null;

  constructor(
    private readonly config: AppConfigService,
    @Inject(PUSH_NOTIFICATION_SERVICE) private readonly pushService: PushNotificationService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.config.redisUrl;
    if (!redisUrl) return;

    try {
      const { Worker } = await import('bullmq');
      this.worker = new Worker(
        'notification',
        async (job) => {
          const { userIds, title, body, data } = job.data as {
            userIds: string[];
            title: string;
            body: string;
            data?: Record<string, string>;
          };
          this.logger.log(`Processing notification job ${job.id} for ${userIds.length} users`);
          await this.pushService.sendToUsers(userIds, { title, body, data });
        },
        {
          connection: { url: redisUrl },
          concurrency: 3,
          limiter: { max: 20, duration: 1000 }, // Max 20 notifications/sec
        },
      );

      this.worker.on('failed', (job, err) => {
        this.logger.error(`Notification job ${job?.id} failed: ${err.message}`);
      });

      this.logger.log('Notification queue worker started (concurrency: 3)');
    } catch (error) {
      this.logger.warn(
        `Notification worker init failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.worker) await this.worker.close();
  }
}
