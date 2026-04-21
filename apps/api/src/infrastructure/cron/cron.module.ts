import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { MonthlyDuesCronService } from './monthly-dues.cron';
import { SessionPurgeCronService } from './session-purge.cron';
import { TierPeakEvaluationCronService } from './tier-peak-evaluation.cron';
import { SubscriptionModel, SubscriptionSchema } from '@infrastructure/database/schemas/subscription.schema';
import { MongoSubscriptionRepository } from '@infrastructure/repositories/mongo-subscription.repository';
import { MongoActiveStudentCounter } from '@infrastructure/subscription/mongo-active-student-counter';
import { SUBSCRIPTION_REPOSITORY } from '@domain/subscription/ports/subscription.repository';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import { ACTIVE_STUDENT_COUNTER } from '@application/subscription/ports/active-student-counter.port';
import type { ActiveStudentCounterPort } from '@application/subscription/ports/active-student-counter.port';
import { CLOCK_PORT } from '@application/common/clock.port';
import type { ClockPort } from '@application/common/clock.port';
import { SystemClock } from '@application/common/system-clock';
import { EvaluateTierUseCase } from '@application/subscription/use-cases/evaluate-tier.usecase';
import { SessionModel, SessionSchema } from '@infrastructure/database/schemas/session.schema';
import { MongoSessionRepository } from '@infrastructure/repositories/mongo-session.repository';
import { SESSION_REPOSITORY } from '@domain/identity/ports/session.repository';
import { AcademyModel, AcademySchema } from '@infrastructure/database/schemas/academy.schema';
import { FeeDueModel, FeeDueSchema } from '@infrastructure/database/schemas/fee-due.schema';
import { StudentModel, StudentSchema } from '@infrastructure/database/schemas/student.schema';
import { MongoAcademyRepository } from '@infrastructure/repositories/mongo-academy.repository';
import { MongoStudentRepository } from '@infrastructure/repositories/mongo-student.repository';
import { MongoFeeDueRepository } from '@infrastructure/repositories/mongo-fee-due.repository';
import { MongoAuditLogRepository } from '@infrastructure/repositories/mongo-audit-log.repository';
import { AuditLogModel, AuditLogSchema } from '@infrastructure/database/schemas/audit-log.schema';
import { ACADEMY_REPOSITORY } from '@domain/academy/ports/academy.repository';
import { STUDENT_REPOSITORY } from '@domain/student/ports/student.repository';
import { FEE_DUE_REPOSITORY } from '@domain/fee/ports/fee-due.repository';
import { AUDIT_LOG_REPOSITORY } from '@domain/audit/ports/audit-log.repository';
import type { AuditLogRepository } from '@domain/audit/ports/audit-log.repository';
import { AUDIT_RECORDER_PORT } from '@application/audit/ports/audit-recorder.port';
import { AuditRecorderService } from '@application/audit/services/audit-recorder.service';
import type { LoggerPort } from '@shared/logging/logger.port';
import { LOGGER_PORT } from '@shared/logging/logger.port';
import { RunMonthlyDuesEngineUseCase } from '@application/fee/use-cases/run-monthly-dues-engine.usecase';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: AcademyModel.name, schema: AcademySchema },
      { name: FeeDueModel.name, schema: FeeDueSchema },
      { name: StudentModel.name, schema: StudentSchema },
      { name: AuditLogModel.name, schema: AuditLogSchema },
      { name: SessionModel.name, schema: SessionSchema },
      { name: SubscriptionModel.name, schema: SubscriptionSchema },
    ]),
  ],
  providers: [
    { provide: ACADEMY_REPOSITORY, useClass: MongoAcademyRepository },
    { provide: STUDENT_REPOSITORY, useClass: MongoStudentRepository },
    { provide: FEE_DUE_REPOSITORY, useClass: MongoFeeDueRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: MongoAuditLogRepository },
    {
      provide: AUDIT_RECORDER_PORT,
      useFactory: (repo: AuditLogRepository, logger: LoggerPort) =>
        new AuditRecorderService(repo, logger),
      inject: [AUDIT_LOG_REPOSITORY, LOGGER_PORT],
    },
    {
      provide: 'RUN_MONTHLY_DUES_ENGINE_USE_CASE',
      useFactory: (
        academyRepo: AcademyRepository,
        studentRepo: StudentRepository,
        feeDueRepo: FeeDueRepository,
      ) => new RunMonthlyDuesEngineUseCase(academyRepo, studentRepo, feeDueRepo),
      inject: [ACADEMY_REPOSITORY, STUDENT_REPOSITORY, FEE_DUE_REPOSITORY],
    },
    { provide: SESSION_REPOSITORY, useClass: MongoSessionRepository },
    { provide: SUBSCRIPTION_REPOSITORY, useClass: MongoSubscriptionRepository },
    { provide: ACTIVE_STUDENT_COUNTER, useClass: MongoActiveStudentCounter },
    { provide: CLOCK_PORT, useClass: SystemClock },
    {
      provide: 'EVALUATE_TIER_USE_CASE',
      useFactory: (
        subRepo: SubscriptionRepository,
        counter: ActiveStudentCounterPort,
        clock: ClockPort,
      ) => new EvaluateTierUseCase(subRepo, counter, clock),
      inject: [SUBSCRIPTION_REPOSITORY, ACTIVE_STUDENT_COUNTER, CLOCK_PORT],
    },
    MonthlyDuesCronService,
    SessionPurgeCronService,
    TierPeakEvaluationCronService,
  ],
})
export class CronModule {}
