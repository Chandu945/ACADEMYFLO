import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import type { Worker } from 'bullmq';
import { AppConfigService } from '@shared/config/config.service';
import type { EmailSenderPort } from '@application/notifications/ports/email-sender.port';
import { EMAIL_SENDER_PORT } from '@application/notifications/ports/email-sender.port';

@Injectable()
export class EmailQueueProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueProcessor.name);
  private worker: Worker | null = null;

  constructor(
    private readonly config: AppConfigService,
    @Inject(EMAIL_SENDER_PORT) private readonly emailSender: EmailSenderPort,
  ) {}

  async onModuleInit() {
    const redisUrl = this.config.redisUrl;
    if (!redisUrl) return;

    try {
      const { Worker } = await import('bullmq');
      this.worker = new Worker(
        'email',
        async (job) => {
          const { to, subject, html } = job.data as { to: string; subject: string; html: string };
          this.logger.log(`Processing email job ${job.id} to ${to}`);
          const success = await this.emailSender.send({ to, subject, html });
          if (!success) throw new Error('Email send failed');
        },
        {
          connection: { url: redisUrl },
          concurrency: 5,
          limiter: { max: 10, duration: 1000 }, // Max 10 emails/sec
        },
      );

      this.worker.on('completed', (job) => {
        this.logger.log(`Email job ${job.id} completed`);
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(`Email job ${job?.id} failed: ${err.message}`);
      });

      this.logger.log('Email queue worker started (concurrency: 5)');
    } catch (error) {
      this.logger.warn(
        `Email worker init failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.worker) await this.worker.close();
  }
}
