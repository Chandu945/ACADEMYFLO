import { Injectable, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SendFeeRemindersUseCase } from '@application/notifications/use-cases/send-fee-reminders.usecase';
import { SendOverduePushRemindersUseCase } from '@application/notifications/use-cases/send-overdue-push-reminders.usecase';
import { AppConfigService } from '@shared/config/config.service';
import type { JobLockPort } from '@application/common/ports/job-lock.port';
import { JOB_LOCK_PORT } from '@application/common/ports/job-lock.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import { LOGGER_PORT } from '@shared/logging/logger.port';
import type { EmailSenderPort } from '@application/notifications/ports/email-sender.port';
import { EMAIL_SENDER_PORT } from '@application/notifications/ports/email-sender.port';
import type { PushNotificationService } from '@application/notifications/push-notification.service';
import { PUSH_NOTIFICATION_SERVICE } from '../../presentation/http/device-tokens/device-tokens.module';
import { QueueService } from '@infrastructure/queue/queue.service';

const LOCK_TTL_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class FeeRemindersCronService {
  constructor(
    @Inject('SEND_FEE_REMINDERS_USE_CASE')
    private readonly sendReminders: SendFeeRemindersUseCase,
    @Inject('SEND_OVERDUE_PUSH_REMINDERS_USE_CASE')
    private readonly sendOverduePush: SendOverduePushRemindersUseCase,
    private readonly config: AppConfigService,
    @Inject(JOB_LOCK_PORT)
    private readonly jobLock: JobLockPort,
    @Inject(LOGGER_PORT)
    private readonly logger: LoggerPort,
    @Inject(EMAIL_SENDER_PORT)
    private readonly emailSender: EmailSenderPort,
    @Inject(PUSH_NOTIFICATION_SERVICE)
    private readonly pushService: PushNotificationService,
    private readonly queueService: QueueService,
  ) {
    // Register synchronous fallbacks for when Redis/BullMQ is unavailable.
    // This ensures emails and push notifications still work without a queue.
    this.queueService.registerEmailFallback(async (data) => {
      await this.emailSender.send(data);
    });

    this.queueService.registerNotificationFallback(async (data) => {
      await this.pushService.sendToUsers(data.userIds, {
        title: data.title,
        body: data.body,
        data: data.data,
      });
    });
  }

  /** Email reminders — 3 days before due date, daily at 09:00 IST */
  @Cron('0 9 * * *', { timeZone: 'Asia/Kolkata' })
  async handleFeeReminders(): Promise<void> {
    if (!this.config.feeReminderEnabled) {
      this.logger.debug('Fee reminders cron: disabled, skipping');
      return;
    }

    await this.jobLock.withLock('fee-reminders', LOCK_TTL_MS, async () => {
      try {
        const result = await this.sendReminders.execute();
        if (result.ok) {
          this.logger.info(
            'Fee reminders cron completed',
            result.value as unknown as Record<string, unknown>,
          );
        }
      } catch (error) {
        this.logger.error('Fee reminders cron failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  /**
   * Overdue push reminders to parents — daily at 09:30 IST.
   *
   * Schedule per fee: on due date, +1 day, +2 days, then every 3 days.
   */
  @Cron('30 9 * * *', { timeZone: 'Asia/Kolkata' })
  async handleOverduePushReminders(): Promise<void> {
    await this.jobLock.withLock('overdue-push-reminders', LOCK_TTL_MS, async () => {
      try {
        const result = await this.sendOverduePush.execute();
        if (result.ok) {
          this.logger.info(
            'Overdue push reminders cron completed',
            result.value as unknown as Record<string, unknown>,
          );
        }
      } catch (error) {
        this.logger.error('Overdue push reminders cron failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
}
