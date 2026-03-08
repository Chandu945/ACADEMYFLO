import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionTierCronService } from './subscription-tier-cron.service';
import { AcademyModel, AcademySchema } from '@infrastructure/database/schemas/academy.schema';
import { StudentModel, StudentSchema } from '@infrastructure/database/schemas/student.schema';
import {
  SubscriptionModel,
  SubscriptionSchema,
} from '@infrastructure/database/schemas/subscription.schema';
import { MongoAcademyRepository } from '@infrastructure/repositories/mongo-academy.repository';
import { MongoSubscriptionRepository } from '@infrastructure/repositories/mongo-subscription.repository';
import { MongoActiveStudentCounter } from '@infrastructure/subscription/mongo-active-student-counter';
import { SystemClock } from '@application/common/system-clock';
import { ACADEMY_REPOSITORY } from '@domain/academy/ports/academy.repository';
import { SUBSCRIPTION_REPOSITORY } from '@domain/subscription/ports/subscription.repository';
import { ACTIVE_STUDENT_COUNTER } from '@application/subscription/ports/active-student-counter.port';
import { CLOCK_PORT } from '@application/common/clock.port';
import { EvaluateTierUseCase } from '@application/subscription/use-cases/evaluate-tier.usecase';
import { RecomputePendingTiersUseCase } from '@application/subscription/use-cases/recompute-pending-tiers.usecase';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import type { ActiveStudentCounterPort } from '@application/subscription/ports/active-student-counter.port';
import type { ClockPort } from '@application/common/clock.port';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { LoggerPort } from '@shared/logging/logger.port';
import { LOGGER_PORT } from '@shared/logging/logger.port';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AcademyModel.name, schema: AcademySchema },
      { name: StudentModel.name, schema: StudentSchema },
      { name: SubscriptionModel.name, schema: SubscriptionSchema },
    ]),
  ],
  providers: [
    { provide: ACADEMY_REPOSITORY, useClass: MongoAcademyRepository },
    { provide: SUBSCRIPTION_REPOSITORY, useClass: MongoSubscriptionRepository },
    { provide: ACTIVE_STUDENT_COUNTER, useClass: MongoActiveStudentCounter },
    { provide: CLOCK_PORT, useClass: SystemClock },
    {
      provide: 'EVALUATE_TIER_USE_CASE',
      useFactory: (
        subscriptionRepo: SubscriptionRepository,
        studentCounter: ActiveStudentCounterPort,
        clock: ClockPort,
      ) => new EvaluateTierUseCase(subscriptionRepo, studentCounter, clock),
      inject: [SUBSCRIPTION_REPOSITORY, ACTIVE_STUDENT_COUNTER, CLOCK_PORT],
    },
    {
      provide: 'RECOMPUTE_PENDING_TIERS_USE_CASE',
      useFactory: (
        academyRepo: AcademyRepository,
        evaluateTier: EvaluateTierUseCase,
        logger: LoggerPort,
      ) => new RecomputePendingTiersUseCase(academyRepo, evaluateTier, logger),
      inject: [ACADEMY_REPOSITORY, 'EVALUATE_TIER_USE_CASE', LOGGER_PORT],
    },
    SubscriptionTierCronService,
  ],
})
export class SubscriptionTierCronModule {}
