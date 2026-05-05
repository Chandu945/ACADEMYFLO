import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ParentController } from './parent.controller';
import { FeePaymentWebhookController } from './fee-payment-webhook.controller';
import { FeePaymentTestController } from './fee-payment-test.controller';
import { AuthModule } from '../auth/auth.module';
import { AcademyOnboardingModule } from '../academy-onboarding/academy-onboarding.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { DeviceTokensModule, PUSH_NOTIFICATION_SERVICE } from '../device-tokens/device-tokens.module';
import type { PushNotificationService } from '@application/notifications/push-notification.service';

// Schemas
import {
  ParentStudentLinkModel,
  ParentStudentLinkSchema,
} from '@infrastructure/database/schemas/parent-student-link.schema';
import {
  FeePaymentModel,
  FeePaymentSchema,
} from '@infrastructure/database/schemas/fee-payment.schema';
import { FeeDueModel, FeeDueSchema } from '@infrastructure/database/schemas/fee-due.schema';
import { StudentModel, StudentSchema } from '@infrastructure/database/schemas/student.schema';
import {
  PaymentRequestModel,
  PaymentRequestSchema,
} from '@infrastructure/database/schemas/payment-request.schema';
import { AcademyModel, AcademySchema } from '@infrastructure/database/schemas/academy.schema';
import {
  TransactionLogModel,
  TransactionLogSchema,
} from '@infrastructure/database/schemas/transaction-log.schema';
import {
  StudentAttendanceModel,
  StudentAttendanceSchema,
} from '@infrastructure/database/schemas/student-attendance.schema';
import { HolidayModel, HolidaySchema } from '@infrastructure/database/schemas/holiday.schema';
import {
  StudentBatchModel,
  StudentBatchSchema,
} from '@infrastructure/database/schemas/student-batch.schema';
import { BatchModel, BatchSchema } from '@infrastructure/database/schemas/batch.schema';

// Repository implementations
import { MongoParentStudentLinkRepository } from '@infrastructure/repositories/mongo-parent-student-link.repository';
import { MongoStudentBatchRepository } from '@infrastructure/repositories/mongo-student-batch.repository';
import { MongoBatchRepository } from '@infrastructure/repositories/mongo-batch.repository';
import { MongoFeePaymentRepository } from '@infrastructure/repositories/mongo-fee-payment.repository';
import { MongoFeeDueRepository } from '@infrastructure/repositories/mongo-fee-due.repository';
import { MongoStudentRepository } from '@infrastructure/repositories/mongo-student.repository';
import { MongoTransactionLogRepository } from '@infrastructure/repositories/mongo-transaction-log.repository';
import { MongoStudentAttendanceRepository } from '@infrastructure/repositories/mongo-student-attendance.repository';
import { MongoHolidayRepository } from '@infrastructure/repositories/mongo-holiday.repository';
import { MongoPaymentRequestRepository } from '@infrastructure/repositories/mongo-payment-request.repository';
import { MongoAcademyRepository } from '@infrastructure/repositories/mongo-academy.repository';
import { MongoTransactionService } from '@infrastructure/database/mongo-transaction.service';
import { R2StorageService } from '@infrastructure/storage/r2-storage.service';

// Repository ports
import { PARENT_STUDENT_LINK_REPOSITORY } from '@domain/parent/ports/parent-student-link.repository';
import { FEE_PAYMENT_REPOSITORY } from '@domain/parent/ports/fee-payment.repository';
import { FEE_DUE_REPOSITORY } from '@domain/fee/ports/fee-due.repository';
import { STUDENT_REPOSITORY } from '@domain/student/ports/student.repository';
import { TRANSACTION_LOG_REPOSITORY } from '@domain/fee/ports/transaction-log.repository';
import { STUDENT_ATTENDANCE_REPOSITORY } from '@domain/attendance/ports/student-attendance.repository';
import { HOLIDAY_REPOSITORY } from '@domain/attendance/ports/holiday.repository';
import { STUDENT_BATCH_REPOSITORY } from '@domain/batch/ports/student-batch.repository';
import { BATCH_REPOSITORY } from '@domain/batch/ports/batch.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import { ACADEMY_REPOSITORY } from '@domain/academy/ports/academy.repository';
import { PAYMENT_REQUEST_REPOSITORY } from '@domain/fee/ports/payment-request.repository';
import { FILE_STORAGE_PORT } from '@application/common/ports/file-storage.port';
import type { FileStoragePort } from '@application/common/ports/file-storage.port';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import { PASSWORD_HASHER } from '@application/identity/ports/password-hasher.port';
import { CASHFREE_GATEWAY } from '@domain/subscription-payments/ports/cashfree-gateway.port';
import { TRANSACTION_PORT } from '@application/common/transaction.port';
import { CLOCK_PORT } from '@application/common/clock.port';
import { SystemClock } from '@application/common/system-clock';
import { LOGGER_PORT } from '@shared/logging/logger.port';
import { EMAIL_SENDER_PORT } from '@application/notifications/ports/email-sender.port';
import type { EmailSenderPort } from '@application/notifications/ports/email-sender.port';
import { NodemailerEmailSender } from '@infrastructure/notifications/nodemailer-email-sender';

// Use cases
import { InviteParentUseCase } from '@application/parent/use-cases/invite-parent.usecase';
import { GetMyChildrenUseCase } from '@application/parent/use-cases/get-my-children.usecase';
import { GetChildAttendanceUseCase } from '@application/parent/use-cases/get-child-attendance.usecase';
import { GetChildFeesUseCase } from '@application/parent/use-cases/get-child-fees.usecase';
import { InitiateFeePaymentUseCase } from '@application/parent/use-cases/initiate-fee-payment.usecase';
import { HandleFeePaymentWebhookUseCase } from '@application/parent/use-cases/handle-fee-payment-webhook.usecase';
import type { FeeWebhookSignatureVerifier } from '@application/parent/use-cases/handle-fee-payment-webhook.usecase';
import { GetFeePaymentStatusUseCase } from '@application/parent/use-cases/get-fee-payment-status.usecase';
import { GetReceiptUseCase } from '@application/parent/use-cases/get-receipt.usecase';
import { UpdateParentProfileUseCase } from '@application/parent/use-cases/update-parent-profile.usecase';
import { ChangePasswordUseCase } from '@application/parent/use-cases/change-password.usecase';
import { GetAcademyInfoUseCase } from '@application/parent/use-cases/get-academy-info.usecase';
import { GetPaymentHistoryUseCase } from '@application/parent/use-cases/get-payment-history.usecase';
import { GetAcademyPaymentMethodsUseCase } from '@application/parent/use-cases/get-academy-payment-methods.usecase';
import { CreateParentPaymentRequestUseCase } from '@application/parent/use-cases/create-parent-payment-request.usecase';
import { UploadPaymentProofUseCase } from '@application/parent/use-cases/upload-payment-proof.usecase';

// Cashfree infra
import { CashfreeAdapter } from '@infrastructure/payments/cashfree/cashfree.adapter';
import { CashfreeHttpClient } from '@infrastructure/payments/cashfree/cashfree-http.client';
import { CashfreeSignatureVerifier } from '@infrastructure/payments/cashfree/cashfree.signature';
import { AppConfigService } from '@shared/config/config.service';

// Types for injection
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { FeePaymentRepository } from '@domain/parent/ports/fee-payment.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { TransactionLogRepository } from '@domain/fee/ports/transaction-log.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { PasswordHasher } from '@application/identity/ports/password-hasher.port';
import type { CashfreeGatewayPort } from '@domain/subscription-payments/ports/cashfree-gateway.port';
import type { TransactionPort } from '@application/common/transaction.port';
import type { ClockPort } from '@application/common/clock.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import type { ExternalCallPolicyPort } from '@application/common/ports/external-call-policy.port';
import { EXTERNAL_CALL_POLICY } from '@application/common/ports/external-call-policy.port';
import { AUDIT_RECORDER_PORT } from '@application/audit/ports/audit-recorder.port';
import type { AuditRecorderPort } from '@application/audit/ports/audit-recorder.port';

const FEE_WEBHOOK_SIGNATURE_VERIFIER = Symbol('FEE_WEBHOOK_SIGNATURE_VERIFIER');

@Module({
  imports: [
    AuthModule,
    AcademyOnboardingModule,
    AuditLogsModule,
    DeviceTokensModule,
    MongooseModule.forFeature([
      { name: ParentStudentLinkModel.name, schema: ParentStudentLinkSchema },
      { name: FeePaymentModel.name, schema: FeePaymentSchema },
      { name: FeeDueModel.name, schema: FeeDueSchema },
      { name: StudentModel.name, schema: StudentSchema },
      { name: TransactionLogModel.name, schema: TransactionLogSchema },
      { name: StudentAttendanceModel.name, schema: StudentAttendanceSchema },
      { name: HolidayModel.name, schema: HolidaySchema },
      { name: PaymentRequestModel.name, schema: PaymentRequestSchema },
      { name: AcademyModel.name, schema: AcademySchema },
      { name: StudentBatchModel.name, schema: StudentBatchSchema },
      { name: BatchModel.name, schema: BatchSchema },
    ]),
  ],
  controllers: [
    ParentController,
    FeePaymentWebhookController,
    ...(process.env['NODE_ENV'] !== 'production' && process.env['APP_ENV'] === 'development'
      ? [FeePaymentTestController]
      : []),
  ],
  providers: [
    // Repositories
    { provide: PARENT_STUDENT_LINK_REPOSITORY, useClass: MongoParentStudentLinkRepository },
    { provide: FEE_PAYMENT_REPOSITORY, useClass: MongoFeePaymentRepository },
    { provide: FEE_DUE_REPOSITORY, useClass: MongoFeeDueRepository },
    { provide: STUDENT_REPOSITORY, useClass: MongoStudentRepository },
    { provide: TRANSACTION_LOG_REPOSITORY, useClass: MongoTransactionLogRepository },
    { provide: STUDENT_ATTENDANCE_REPOSITORY, useClass: MongoStudentAttendanceRepository },
    { provide: HOLIDAY_REPOSITORY, useClass: MongoHolidayRepository },
    { provide: PAYMENT_REQUEST_REPOSITORY, useClass: MongoPaymentRequestRepository },
    { provide: ACADEMY_REPOSITORY, useClass: MongoAcademyRepository },
    { provide: STUDENT_BATCH_REPOSITORY, useClass: MongoStudentBatchRepository },
    { provide: BATCH_REPOSITORY, useClass: MongoBatchRepository },
    { provide: FILE_STORAGE_PORT, useClass: R2StorageService },
    { provide: TRANSACTION_PORT, useClass: MongoTransactionService },
    { provide: CLOCK_PORT, useClass: SystemClock },

    // Cashfree
    {
      provide: CashfreeHttpClient,
      useFactory: (config: AppConfigService, logger: LoggerPort, callPolicy: ExternalCallPolicyPort) =>
        new CashfreeHttpClient(
          {
            clientId: config.cashfreeClientId,
            clientSecret: config.cashfreeClientSecret,
            apiVersion: config.cashfreeApiVersion,
            baseUrl: config.cashfreeBaseUrl,
          },
          logger,
          callPolicy,
        ),
      inject: [AppConfigService, LOGGER_PORT, EXTERNAL_CALL_POLICY],
    },
    {
      provide: CASHFREE_GATEWAY,
      useFactory: (httpClient: CashfreeHttpClient, logger: LoggerPort) =>
        new CashfreeAdapter(httpClient, logger),
      inject: [CashfreeHttpClient, LOGGER_PORT],
    },
    {
      provide: FEE_WEBHOOK_SIGNATURE_VERIFIER,
      useFactory: (config: AppConfigService) =>
        new CashfreeSignatureVerifier(config.cashfreeWebhookSecret),
      inject: [AppConfigService],
    },

    { provide: EMAIL_SENDER_PORT, useClass: NodemailerEmailSender },

    // Use cases
    {
      provide: 'INVITE_PARENT_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        studentRepo: StudentRepository,
        linkRepo: ParentStudentLinkRepository,
        academyRepo: AcademyRepository,
        hasher: PasswordHasher,
        emailSender: EmailSenderPort,
      ) => new InviteParentUseCase(userRepo, studentRepo, linkRepo, academyRepo, hasher, emailSender),
      inject: [USER_REPOSITORY, STUDENT_REPOSITORY, PARENT_STUDENT_LINK_REPOSITORY, ACADEMY_REPOSITORY, PASSWORD_HASHER, EMAIL_SENDER_PORT],
    },
    {
      provide: 'GET_MY_CHILDREN_USE_CASE',
      useFactory: (
        linkRepo: ParentStudentLinkRepository,
        studentRepo: StudentRepository,
        attendanceRepo: StudentAttendanceRepository,
        holidayRepo: HolidayRepository,
        feeDueRepo: FeeDueRepository,
        sbr: StudentBatchRepository,
        br: BatchRepository,
      ) =>
        new GetMyChildrenUseCase(
          linkRepo,
          studentRepo,
          attendanceRepo,
          holidayRepo,
          feeDueRepo,
          sbr,
          br,
        ),
      inject: [
        PARENT_STUDENT_LINK_REPOSITORY,
        STUDENT_REPOSITORY,
        STUDENT_ATTENDANCE_REPOSITORY,
        HOLIDAY_REPOSITORY,
        FEE_DUE_REPOSITORY,
        STUDENT_BATCH_REPOSITORY,
        BATCH_REPOSITORY,
      ],
    },
    {
      provide: 'GET_CHILD_ATTENDANCE_USE_CASE',
      useFactory: (
        linkRepo: ParentStudentLinkRepository,
        attendanceRepo: StudentAttendanceRepository,
        holidayRepo: HolidayRepository,
        studentRepo: StudentRepository,
        sbr: StudentBatchRepository,
        br: BatchRepository,
      ) =>
        new GetChildAttendanceUseCase(linkRepo, attendanceRepo, holidayRepo, studentRepo, sbr, br),
      inject: [
        PARENT_STUDENT_LINK_REPOSITORY,
        STUDENT_ATTENDANCE_REPOSITORY,
        HOLIDAY_REPOSITORY,
        STUDENT_REPOSITORY,
        STUDENT_BATCH_REPOSITORY,
        BATCH_REPOSITORY,
      ],
    },
    {
      provide: 'GET_CHILD_FEES_USE_CASE',
      useFactory: (
        linkRepo: ParentStudentLinkRepository,
        feeDueRepo: FeeDueRepository,
        academyRepo: AcademyRepository,
        prRepo: PaymentRequestRepository,
        clock: ClockPort,
      ) => new GetChildFeesUseCase(linkRepo, feeDueRepo, academyRepo, prRepo, clock),
      inject: [
        PARENT_STUDENT_LINK_REPOSITORY,
        FEE_DUE_REPOSITORY,
        ACADEMY_REPOSITORY,
        PAYMENT_REQUEST_REPOSITORY,
        CLOCK_PORT,
      ],
    },
    {
      provide: 'INITIATE_FEE_PAYMENT_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        linkRepo: ParentStudentLinkRepository,
        feeDueRepo: FeeDueRepository,
        feePaymentRepo: FeePaymentRepository,
        academyRepo: AcademyRepository,
        gateway: CashfreeGatewayPort,
        clock: ClockPort,
        logger: LoggerPort,
        auditRecorder: AuditRecorderPort,
        config: AppConfigService,
      ) =>
        new InitiateFeePaymentUseCase(
          userRepo,
          linkRepo,
          feeDueRepo,
          feePaymentRepo,
          academyRepo,
          gateway,
          clock,
          logger,
          auditRecorder,
          config.parentOnlinePaymentsEnabled,
        ),
      inject: [
        USER_REPOSITORY,
        PARENT_STUDENT_LINK_REPOSITORY,
        FEE_DUE_REPOSITORY,
        FEE_PAYMENT_REPOSITORY,
        ACADEMY_REPOSITORY,
        CASHFREE_GATEWAY,
        CLOCK_PORT,
        LOGGER_PORT,
        AUDIT_RECORDER_PORT,
        AppConfigService,
      ],
    },
    {
      provide: 'HANDLE_FEE_PAYMENT_WEBHOOK_USE_CASE',
      useFactory: (
        feePaymentRepo: FeePaymentRepository,
        feeDueRepo: FeeDueRepository,
        txLogRepo: TransactionLogRepository,
        academyRepo: AcademyRepository,
        verifier: FeeWebhookSignatureVerifier,
        clock: ClockPort,
        transaction: TransactionPort,
        logger: LoggerPort,
        auditRecorder: AuditRecorderPort,
      ) =>
        new HandleFeePaymentWebhookUseCase(
          feePaymentRepo,
          feeDueRepo,
          txLogRepo,
          academyRepo,
          verifier,
          clock,
          transaction,
          logger,
          auditRecorder,
        ),
      inject: [
        FEE_PAYMENT_REPOSITORY,
        FEE_DUE_REPOSITORY,
        TRANSACTION_LOG_REPOSITORY,
        ACADEMY_REPOSITORY,
        FEE_WEBHOOK_SIGNATURE_VERIFIER,
        CLOCK_PORT,
        TRANSACTION_PORT,
        LOGGER_PORT,
        AUDIT_RECORDER_PORT,
      ],
    },
    {
      provide: 'GET_FEE_PAYMENT_STATUS_USE_CASE',
      useFactory: (
        feePaymentRepo: FeePaymentRepository,
        feeDueRepo: FeeDueRepository,
        txLogRepo: TransactionLogRepository,
        academyRepo: AcademyRepository,
        gateway: CashfreeGatewayPort,
        clock: ClockPort,
        transaction: TransactionPort,
        logger: LoggerPort,
        auditRecorder: AuditRecorderPort,
      ) =>
        new GetFeePaymentStatusUseCase(
          feePaymentRepo,
          feeDueRepo,
          txLogRepo,
          academyRepo,
          gateway,
          clock,
          transaction,
          logger,
          auditRecorder,
        ),
      inject: [
        FEE_PAYMENT_REPOSITORY,
        FEE_DUE_REPOSITORY,
        TRANSACTION_LOG_REPOSITORY,
        ACADEMY_REPOSITORY,
        CASHFREE_GATEWAY,
        CLOCK_PORT,
        TRANSACTION_PORT,
        LOGGER_PORT,
        AUDIT_RECORDER_PORT,
      ],
    },
    {
      provide: 'GET_RECEIPT_USE_CASE',
      useFactory: (
        linkRepo: ParentStudentLinkRepository,
        feeDueRepo: FeeDueRepository,
        txLogRepo: TransactionLogRepository,
        studentRepo: StudentRepository,
        academyRepo: AcademyRepository,
      ) => new GetReceiptUseCase(linkRepo, feeDueRepo, txLogRepo, studentRepo, academyRepo),
      inject: [
        PARENT_STUDENT_LINK_REPOSITORY,
        FEE_DUE_REPOSITORY,
        TRANSACTION_LOG_REPOSITORY,
        STUDENT_REPOSITORY,
        ACADEMY_REPOSITORY,
      ],
    },
    {
      provide: 'UPDATE_PARENT_PROFILE_USE_CASE',
      useFactory: (userRepo: UserRepository) => new UpdateParentProfileUseCase(userRepo),
      inject: [USER_REPOSITORY],
    },
    {
      provide: 'CHANGE_PASSWORD_USE_CASE',
      useFactory: (userRepo: UserRepository, hasher: PasswordHasher) =>
        new ChangePasswordUseCase(userRepo, hasher),
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
    },
    {
      provide: 'GET_ACADEMY_INFO_USE_CASE',
      useFactory: (linkRepo: ParentStudentLinkRepository, academyRepo: AcademyRepository) =>
        new GetAcademyInfoUseCase(linkRepo, academyRepo),
      inject: [PARENT_STUDENT_LINK_REPOSITORY, ACADEMY_REPOSITORY],
    },
    {
      provide: 'GET_PAYMENT_HISTORY_USE_CASE',
      useFactory: (
        linkRepo: ParentStudentLinkRepository,
        txLogRepo: TransactionLogRepository,
        studentRepo: StudentRepository,
      ) => new GetPaymentHistoryUseCase(linkRepo, txLogRepo, studentRepo),
      inject: [PARENT_STUDENT_LINK_REPOSITORY, TRANSACTION_LOG_REPOSITORY, STUDENT_REPOSITORY],
    },
    {
      provide: 'GET_ACADEMY_PAYMENT_METHODS_USE_CASE',
      useFactory: (userRepo: UserRepository, academyRepo: AcademyRepository) =>
        new GetAcademyPaymentMethodsUseCase(userRepo, academyRepo),
      inject: [USER_REPOSITORY, ACADEMY_REPOSITORY],
    },
    {
      provide: 'UPLOAD_PAYMENT_PROOF_USE_CASE',
      useFactory: (userRepo: UserRepository, fileStorage: FileStoragePort) =>
        new UploadPaymentProofUseCase(userRepo, fileStorage),
      inject: [USER_REPOSITORY, FILE_STORAGE_PORT],
    },
    {
      provide: 'CREATE_PARENT_PAYMENT_REQUEST_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        studentRepo: StudentRepository,
        feeDueRepo: FeeDueRepository,
        academyRepo: AcademyRepository,
        prRepo: PaymentRequestRepository,
        linkRepo: ParentStudentLinkRepository,
        auditRecorder: AuditRecorderPort,
        clock: ClockPort,
      ) =>
        new CreateParentPaymentRequestUseCase(
          userRepo,
          studentRepo,
          feeDueRepo,
          academyRepo,
          prRepo,
          linkRepo,
          auditRecorder,
          clock,
        ),
      inject: [
        USER_REPOSITORY,
        STUDENT_REPOSITORY,
        FEE_DUE_REPOSITORY,
        ACADEMY_REPOSITORY,
        PAYMENT_REQUEST_REPOSITORY,
        PARENT_STUDENT_LINK_REPOSITORY,
        AUDIT_RECORDER_PORT,
        CLOCK_PORT,
      ],
    },
  ],
  exports: ['INVITE_PARENT_USE_CASE'],
})
export class ParentModule {}
