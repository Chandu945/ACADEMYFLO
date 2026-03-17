import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { EmailQueueProcessor } from './processors/email-queue.processor';
import { NotificationQueueProcessor } from './processors/notification-queue.processor';
import { NodemailerEmailSender } from '@infrastructure/notifications/nodemailer-email-sender';
import { EMAIL_SENDER_PORT } from '@application/notifications/ports/email-sender.port';
import { DeviceTokensModule } from '../../presentation/http/device-tokens/device-tokens.module';

@Global()
@Module({
  imports: [
    // DeviceTokensModule exports PUSH_NOTIFICATION_SERVICE needed by NotificationQueueProcessor
    DeviceTokensModule,
  ],
  providers: [
    QueueService,
    // EMAIL_SENDER_PORT for the email worker to call when processing jobs
    { provide: EMAIL_SENDER_PORT, useClass: NodemailerEmailSender },
    EmailQueueProcessor,
    NotificationQueueProcessor,
  ],
  exports: [QueueService],
})
export class QueueModule {}
