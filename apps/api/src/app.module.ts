import { Module, Global } from '@nestjs/common';
import { AppConfigModule } from './shared/config/config.module';
import { LoggingModule } from './shared/logging/logging.module';
import { PresentationModule } from './presentation/presentation.module';
import { CronModule } from './infrastructure/cron/cron.module';
import { FeeRemindersCronModule } from './infrastructure/scheduling/fee-reminders-cron.module';
import { SubscriptionTierCronModule } from './infrastructure/scheduling/subscription-tier-cron.module';
import { JobLockModule } from './infrastructure/reliability/job-lock/job-lock.module';
import { ExternalCallPolicy } from './infrastructure/reliability/external-call/external-call-policy';
import { EXTERNAL_CALL_POLICY } from './application/common/ports/external-call-policy.port';
import { CacheModule } from './infrastructure/cache/redis.module';
import { QueueModule } from './infrastructure/queue/queue.module';

@Global()
@Module({
  imports: [
    AppConfigModule,
    LoggingModule,
    JobLockModule,
    CacheModule,
    QueueModule,
    PresentationModule,
    CronModule,
    FeeRemindersCronModule,
    SubscriptionTierCronModule,
  ],
  providers: [
    {
      provide: EXTERNAL_CALL_POLICY,
      useClass: ExternalCallPolicy,
    },
  ],
  exports: [EXTERNAL_CALL_POLICY],
})
export class AppModule {}
