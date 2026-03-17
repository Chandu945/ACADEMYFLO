import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { AppConfigService } from '@shared/config/config.service';

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface NotificationJobData {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private emailQueue: import('bullmq').Queue | null = null;
  private notificationQueue: import('bullmq').Queue | null = null;
  private isQueueAvailable = false;

  // Fallback handlers for when Redis is not available
  private emailFallback: ((data: EmailJobData) => Promise<void>) | null = null;
  private notificationFallback: ((data: NotificationJobData) => Promise<void>) | null = null;

  constructor(private readonly config: AppConfigService) {}

  async onModuleInit() {
    const redisUrl = this.config.redisUrl;
    if (!redisUrl) {
      this.logger.warn('No REDIS_URL configured — queue disabled, using synchronous fallback');
      return;
    }

    try {
      const { Queue } = await import('bullmq');
      const connection = { url: redisUrl };

      this.emailQueue = new Queue('email', {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
        },
      });

      this.notificationQueue = new Queue('notification', {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
        },
      });

      this.isQueueAvailable = true;
      this.logger.log('BullMQ queues initialized (email, notification)');
    } catch (error) {
      this.logger.warn(
        `BullMQ unavailable, using synchronous fallback: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.emailQueue) await this.emailQueue.close();
    if (this.notificationQueue) await this.notificationQueue.close();
  }

  /** Register a fallback handler for when Redis is unavailable */
  registerEmailFallback(handler: (data: EmailJobData) => Promise<void>) {
    this.emailFallback = handler;
  }

  registerNotificationFallback(handler: (data: NotificationJobData) => Promise<void>) {
    this.notificationFallback = handler;
  }

  async enqueueEmail(data: EmailJobData): Promise<void> {
    if (this.isQueueAvailable && this.emailQueue) {
      await this.emailQueue.add('send-email', data);
      return;
    }
    // Synchronous fallback
    if (this.emailFallback) {
      await this.emailFallback(data);
    } else {
      this.logger.warn('Email not sent — no queue and no fallback registered');
    }
  }

  async enqueueNotification(data: NotificationJobData): Promise<void> {
    if (this.isQueueAvailable && this.notificationQueue) {
      await this.notificationQueue.add('send-notification', data);
      return;
    }
    if (this.notificationFallback) {
      await this.notificationFallback(data);
    } else {
      this.logger.warn('Notification not sent — no queue and no fallback registered');
    }
  }

  get queuesAvailable(): boolean {
    return this.isQueueAvailable;
  }
}
