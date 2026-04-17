import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';
import { AcademyOnboardingModule } from '../academy-onboarding/academy-onboarding.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MongoAdminQueryRepository } from '@infrastructure/admin/mongo-admin-query.repository';
import { CryptoPasswordGenerator } from '@infrastructure/security/password-generator';
import { AcademyModel, AcademySchema } from '@infrastructure/database/schemas/academy.schema';
import { UserModel, UserSchema } from '@infrastructure/database/schemas/user.schema';
import {
  SubscriptionModel,
  SubscriptionSchema,
} from '@infrastructure/database/schemas/subscription.schema';
import { StudentModel, StudentSchema } from '@infrastructure/database/schemas/student.schema';
import {
  TransactionLogModel,
  TransactionLogSchema,
} from '@infrastructure/database/schemas/transaction-log.schema';
import { ADMIN_QUERY_REPOSITORY } from '@domain/admin/ports/admin-query.repository';
import type { AdminQueryRepository } from '@domain/admin/ports/admin-query.repository';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { SESSION_REPOSITORY } from '@domain/identity/ports/session.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import { ACADEMY_REPOSITORY } from '@domain/academy/ports/academy.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import { DEVICE_TOKEN_REPOSITORY } from '@domain/notification/ports/device-token.repository';
import type { DeviceTokenRepository } from '@domain/notification/ports/device-token.repository';
import { SUBSCRIPTION_REPOSITORY } from '@domain/subscription/ports/subscription.repository';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import { AUDIT_LOG_REPOSITORY } from '@domain/audit/ports/audit-log.repository';
import type { AuditLogRepository } from '@domain/audit/ports/audit-log.repository';
import { AUDIT_RECORDER_PORT } from '@application/audit/ports/audit-recorder.port';
import type { AuditRecorderPort } from '@application/audit/ports/audit-recorder.port';
import { PASSWORD_HASHER } from '@application/identity/ports/password-hasher.port';
import type { PasswordHasher } from '@application/identity/ports/password-hasher.port';
import { PASSWORD_GENERATOR } from '@application/common/password-generator.port';
import type { PasswordGeneratorPort } from '@application/common/password-generator.port';
import { GetAdminDashboardUseCase } from '@application/admin/use-cases/get-admin-dashboard.usecase';
import { ListAcademiesUseCase } from '@application/admin/use-cases/list-academies.usecase';
import { GetAcademyDetailUseCase } from '@application/admin/use-cases/get-academy-detail.usecase';
import { SetSubscriptionManualUseCase } from '@application/admin/use-cases/set-subscription-manual.usecase';
import { DeactivateSubscriptionUseCase } from '@application/admin/use-cases/deactivate-subscription.usecase';
import { SetAcademyLoginDisabledUseCase } from '@application/admin/use-cases/set-academy-login-disabled.usecase';
import { ForceLogoutAcademyUseCase } from '@application/admin/use-cases/force-logout-academy.usecase';
import { ResetOwnerPasswordUseCase } from '@application/admin/use-cases/reset-owner-password.usecase';
import { ListAcademyAuditLogsUseCase } from '@application/admin/use-cases/list-academy-audit-logs.usecase';
import { EMAIL_SENDER_PORT } from '@application/notifications/ports/email-sender.port';
import type { EmailSenderPort } from '@application/notifications/ports/email-sender.port';
import { NodemailerEmailSender } from '@infrastructure/notifications/nodemailer-email-sender';
import { MongoDbModule } from '@infrastructure/database/mongodb.module';

@Module({
  imports: [
    MongoDbModule.register(),
    MongooseModule.forFeature([
      { name: AcademyModel.name, schema: AcademySchema },
      { name: UserModel.name, schema: UserSchema },
      { name: SubscriptionModel.name, schema: SubscriptionSchema },
      { name: StudentModel.name, schema: StudentSchema },
      { name: TransactionLogModel.name, schema: TransactionLogSchema },
    ]),
    AuthModule,
    AcademyOnboardingModule,
    SubscriptionModule,
    AuditLogsModule,
  ],
  controllers: [AdminController],
  providers: [
    { provide: ADMIN_QUERY_REPOSITORY, useClass: MongoAdminQueryRepository },
    { provide: PASSWORD_GENERATOR, useClass: CryptoPasswordGenerator },

    // Use-case factories
    {
      provide: 'GET_ADMIN_DASHBOARD_USE_CASE',
      useFactory: (repo: AdminQueryRepository) => new GetAdminDashboardUseCase(repo),
      inject: [ADMIN_QUERY_REPOSITORY],
    },
    {
      provide: 'LIST_ACADEMIES_USE_CASE',
      useFactory: (repo: AdminQueryRepository) => new ListAcademiesUseCase(repo),
      inject: [ADMIN_QUERY_REPOSITORY],
    },
    {
      provide: 'GET_ACADEMY_DETAIL_USE_CASE',
      useFactory: (repo: AdminQueryRepository) => new GetAcademyDetailUseCase(repo),
      inject: [ADMIN_QUERY_REPOSITORY],
    },
    {
      provide: 'SET_SUBSCRIPTION_MANUAL_USE_CASE',
      useFactory: (repo: SubscriptionRepository, auditRecorder: AuditRecorderPort) =>
        new SetSubscriptionManualUseCase(repo, auditRecorder),
      inject: [SUBSCRIPTION_REPOSITORY, AUDIT_RECORDER_PORT],
    },
    {
      provide: 'DEACTIVATE_SUBSCRIPTION_USE_CASE',
      useFactory: (
        repo: SubscriptionRepository,
        auditRecorder: AuditRecorderPort,
        emailSender: EmailSenderPort,
        userRepo: UserRepository,
        academyRepo: AcademyRepository,
      ) => new DeactivateSubscriptionUseCase(repo, auditRecorder, emailSender, userRepo, academyRepo),
      inject: [SUBSCRIPTION_REPOSITORY, AUDIT_RECORDER_PORT, EMAIL_SENDER_PORT, USER_REPOSITORY, ACADEMY_REPOSITORY],
    },
    {
      provide: 'SET_ACADEMY_LOGIN_DISABLED_USE_CASE',
      useFactory: (
        academyRepo: AcademyRepository,
        userRepo: UserRepository,
        sessionRepo: SessionRepository,
        auditRecorder: AuditRecorderPort,
        emailSender: EmailSenderPort,
        deviceTokenRepo: DeviceTokenRepository,
      ) => new SetAcademyLoginDisabledUseCase(academyRepo, userRepo, sessionRepo, auditRecorder, emailSender, deviceTokenRepo),
      inject: [ACADEMY_REPOSITORY, USER_REPOSITORY, SESSION_REPOSITORY, AUDIT_RECORDER_PORT, EMAIL_SENDER_PORT, DEVICE_TOKEN_REPOSITORY],
    },
    {
      provide: 'FORCE_LOGOUT_ACADEMY_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        sessionRepo: SessionRepository,
        academyRepo: AcademyRepository,
        auditRecorder: AuditRecorderPort,
        deviceTokenRepo: DeviceTokenRepository,
      ) =>
        new ForceLogoutAcademyUseCase(
          userRepo,
          sessionRepo,
          academyRepo,
          auditRecorder,
          deviceTokenRepo,
        ),
      inject: [
        USER_REPOSITORY,
        SESSION_REPOSITORY,
        ACADEMY_REPOSITORY,
        AUDIT_RECORDER_PORT,
        DEVICE_TOKEN_REPOSITORY,
      ],
    },
    { provide: EMAIL_SENDER_PORT, useClass: NodemailerEmailSender },
    {
      provide: 'RESET_OWNER_PASSWORD_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        sessionRepo: SessionRepository,
        academyRepo: AcademyRepository,
        hasher: PasswordHasher,
        generator: PasswordGeneratorPort,
        auditRecorder: AuditRecorderPort,
        deviceTokenRepo: DeviceTokenRepository,
        emailSender: EmailSenderPort,
      ) =>
        new ResetOwnerPasswordUseCase(
          userRepo,
          sessionRepo,
          academyRepo,
          hasher,
          generator,
          auditRecorder,
          deviceTokenRepo,
          emailSender,
        ),
      inject: [
        USER_REPOSITORY,
        SESSION_REPOSITORY,
        ACADEMY_REPOSITORY,
        PASSWORD_HASHER,
        PASSWORD_GENERATOR,
        AUDIT_RECORDER_PORT,
        DEVICE_TOKEN_REPOSITORY,
        EMAIL_SENDER_PORT,
      ],
    },
    {
      provide: 'LIST_ACADEMY_AUDIT_LOGS_USE_CASE',
      useFactory: (repo: AuditLogRepository, userRepo: UserRepository) =>
        new ListAcademyAuditLogsUseCase(repo, userRepo),
      inject: [AUDIT_LOG_REPOSITORY, USER_REPOSITORY],
    },
  ],
})
export class AdminModule {}
