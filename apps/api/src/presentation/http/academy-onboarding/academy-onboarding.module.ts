import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AcademyOnboardingController } from './academy-onboarding.controller';
import { AcademyModel, AcademySchema } from '@infrastructure/database/schemas/academy.schema';
import {
  SubscriptionModel,
  SubscriptionSchema,
} from '@infrastructure/database/schemas/subscription.schema';
import { MongoAcademyRepository } from '@infrastructure/repositories/mongo-academy.repository';
import { MongoSubscriptionRepository } from '@infrastructure/repositories/mongo-subscription.repository';
import { MongoTransactionService } from '@infrastructure/database/mongo-transaction.service';
import { ACADEMY_REPOSITORY } from '@domain/academy/ports/academy.repository';
import { SUBSCRIPTION_REPOSITORY } from '@domain/subscription/ports/subscription.repository';
import { SetupAcademyUseCase } from '@application/academy/use-cases/setup-academy.usecase';
import { CreateTrialSubscriptionUseCase } from '@application/subscription/use-cases/create-trial-subscription.usecase';
import { SystemClock } from '@application/common/system-clock';
import { CLOCK_PORT } from '@application/common/clock.port';
import { TRANSACTION_PORT } from '@application/common/transaction.port';
import type { TransactionPort } from '@application/common/transaction.port';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import type { ClockPort } from '@application/common/clock.port';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: AcademyModel.name, schema: AcademySchema },
      { name: SubscriptionModel.name, schema: SubscriptionSchema },
    ]),
  ],
  controllers: [AcademyOnboardingController],
  providers: [
    { provide: ACADEMY_REPOSITORY, useClass: MongoAcademyRepository },
    { provide: SUBSCRIPTION_REPOSITORY, useClass: MongoSubscriptionRepository },
    { provide: CLOCK_PORT, useClass: SystemClock },
    { provide: TRANSACTION_PORT, useClass: MongoTransactionService },
    {
      provide: 'CREATE_TRIAL_SUBSCRIPTION_USE_CASE',
      useFactory: (repo: SubscriptionRepository, clock: ClockPort) =>
        new CreateTrialSubscriptionUseCase(repo, clock),
      inject: [SUBSCRIPTION_REPOSITORY, CLOCK_PORT],
    },
    {
      provide: 'SETUP_ACADEMY_USE_CASE',
      useFactory: (
        academyRepo: AcademyRepository,
        userRepo: UserRepository,
        createTrial: CreateTrialSubscriptionUseCase,
        transaction: TransactionPort,
      ) => new SetupAcademyUseCase(academyRepo, userRepo, createTrial, transaction),
      inject: [
        ACADEMY_REPOSITORY,
        USER_REPOSITORY,
        'CREATE_TRIAL_SUBSCRIPTION_USE_CASE',
        TRANSACTION_PORT,
      ],
    },
  ],
  exports: [ACADEMY_REPOSITORY],
})
export class AcademyOnboardingModule {}
