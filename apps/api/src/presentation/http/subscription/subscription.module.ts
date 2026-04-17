import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionController } from './subscription.controller';
import {
  SubscriptionModel,
  SubscriptionSchema,
} from '@infrastructure/database/schemas/subscription.schema';
import { StudentModel, StudentSchema } from '@infrastructure/database/schemas/student.schema';
import { MongoSubscriptionRepository } from '@infrastructure/repositories/mongo-subscription.repository';
import { MongoActiveStudentCounter } from '@infrastructure/subscription/mongo-active-student-counter';
import { SUBSCRIPTION_REPOSITORY } from '@domain/subscription/ports/subscription.repository';
import {
  ACTIVE_STUDENT_COUNTER,
  type ActiveStudentCounterPort,
} from '@application/subscription/ports/active-student-counter.port';
import { CreateTrialSubscriptionUseCase } from '@application/subscription/use-cases/create-trial-subscription.usecase';
import { GetMySubscriptionUseCase } from '@application/subscription/use-cases/get-my-subscription.usecase';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { ClockPort } from '@application/common/clock.port';
import { CLOCK_PORT } from '@application/common/clock.port';
import { SystemClock } from '@application/common/system-clock';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import { ACADEMY_REPOSITORY } from '@domain/academy/ports/academy.repository';
import { EMAIL_SENDER_PORT } from '@application/notifications/ports/email-sender.port';
import type { EmailSenderPort } from '@application/notifications/ports/email-sender.port';
import { NodemailerEmailSender } from '@infrastructure/notifications/nodemailer-email-sender';
import { AuthModule } from '../auth/auth.module';
import { AcademyOnboardingModule } from '../academy-onboarding/academy-onboarding.module';

@Module({
  imports: [
    AuthModule,
    AcademyOnboardingModule,
    MongooseModule.forFeature([
      { name: SubscriptionModel.name, schema: SubscriptionSchema },
      { name: StudentModel.name, schema: StudentSchema },
    ]),
  ],
  controllers: [SubscriptionController],
  providers: [
    { provide: SUBSCRIPTION_REPOSITORY, useClass: MongoSubscriptionRepository },
    { provide: ACTIVE_STUDENT_COUNTER, useClass: MongoActiveStudentCounter },
    { provide: CLOCK_PORT, useClass: SystemClock },
    { provide: EMAIL_SENDER_PORT, useClass: NodemailerEmailSender },
    {
      provide: 'CREATE_TRIAL_SUBSCRIPTION_USE_CASE',
      useFactory: (
        repo: SubscriptionRepository,
        clock: ClockPort,
        emailSender: EmailSenderPort,
        userRepo: UserRepository,
        academyRepo: AcademyRepository,
      ) => new CreateTrialSubscriptionUseCase(repo, clock, emailSender, userRepo, academyRepo),
      inject: [SUBSCRIPTION_REPOSITORY, CLOCK_PORT, EMAIL_SENDER_PORT, USER_REPOSITORY, ACADEMY_REPOSITORY],
    },
    {
      provide: 'GET_MY_SUBSCRIPTION_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        academyRepo: AcademyRepository,
        subscriptionRepo: SubscriptionRepository,
        createTrial: CreateTrialSubscriptionUseCase,
        clock: ClockPort,
        studentCounter: ActiveStudentCounterPort,
      ) =>
        new GetMySubscriptionUseCase(
          userRepo,
          academyRepo,
          subscriptionRepo,
          createTrial,
          clock,
          studentCounter,
        ),
      inject: [
        USER_REPOSITORY,
        ACADEMY_REPOSITORY,
        SUBSCRIPTION_REPOSITORY,
        'CREATE_TRIAL_SUBSCRIPTION_USE_CASE',
        CLOCK_PORT,
        ACTIVE_STUDENT_COUNTER,
      ],
    },
  ],
  exports: ['GET_MY_SUBSCRIPTION_USE_CASE', SUBSCRIPTION_REPOSITORY, CLOCK_PORT],
})
export class SubscriptionModule {}
