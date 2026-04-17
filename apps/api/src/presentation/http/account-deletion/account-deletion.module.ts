import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AccountDeletionController } from './account-deletion.controller';
import { AccountDeletionSweeperCronService } from '@infrastructure/cron/account-deletion-sweeper.cron';

import {
  AccountDeletionRequestModel,
  AccountDeletionRequestSchema,
} from '@infrastructure/database/schemas/account-deletion-request.schema';
import { AcademyModel, AcademySchema } from '@infrastructure/database/schemas/academy.schema';
import { BatchModel, BatchSchema } from '@infrastructure/database/schemas/batch.schema';
import { DeviceTokenModel, DeviceTokenSchema } from '@infrastructure/database/schemas/device-token.schema';
import { EnquiryModel, EnquirySchema } from '@infrastructure/database/schemas/enquiry.schema';
import { EventModel, EventSchema } from '@infrastructure/database/schemas/event.schema';
import { ExpenseCategoryModel, ExpenseCategorySchema } from '@infrastructure/database/schemas/expense-category.schema';
import { ExpenseModel, ExpenseSchema } from '@infrastructure/database/schemas/expense.schema';
import { FeeDueModel, FeeDueSchema } from '@infrastructure/database/schemas/fee-due.schema';
import { FeePaymentModel, FeePaymentSchema } from '@infrastructure/database/schemas/fee-payment.schema';
import { GalleryPhotoModel, GalleryPhotoSchema } from '@infrastructure/database/schemas/gallery-photo.schema';
import { HolidayModel, HolidaySchema } from '@infrastructure/database/schemas/holiday.schema';
import { ParentStudentLinkModel, ParentStudentLinkSchema } from '@infrastructure/database/schemas/parent-student-link.schema';
import { PasswordResetChallengeModel, PasswordResetChallengeSchema } from '@infrastructure/database/schemas/password-reset-challenge.schema';
import { PaymentRequestModel, PaymentRequestSchema } from '@infrastructure/database/schemas/payment-request.schema';
import { SessionModel, SessionSchema } from '@infrastructure/database/schemas/session.schema';
import { StaffAttendanceModel, StaffAttendanceSchema } from '@infrastructure/database/schemas/staff-attendance.schema';
import { StudentAttendanceModel, StudentAttendanceSchema } from '@infrastructure/database/schemas/student-attendance.schema';
import { StudentBatchModel, StudentBatchSchema } from '@infrastructure/database/schemas/student-batch.schema';
import { StudentModel, StudentSchema } from '@infrastructure/database/schemas/student.schema';
import { SubscriptionModel, SubscriptionSchema } from '@infrastructure/database/schemas/subscription.schema';
import { TransactionLogModel, TransactionLogSchema } from '@infrastructure/database/schemas/transaction-log.schema';
import { UserModel, UserSchema } from '@infrastructure/database/schemas/user.schema';

import { MongoAccountDeletionRequestRepository } from '@infrastructure/repositories/mongo-account-deletion-request.repository';
import { ACCOUNT_DELETION_REQUEST_REPOSITORY } from '@domain/account-deletion/ports/account-deletion-request.repository';
import { AcademyTeardownService } from '@infrastructure/services/academy-teardown.service';
import { RequestAccountDeletionUseCase } from '@application/account-deletion/use-cases/request-account-deletion.usecase';
import { CancelAccountDeletionUseCase } from '@application/account-deletion/use-cases/cancel-account-deletion.usecase';
import { ExecuteAccountDeletionUseCase } from '@application/account-deletion/use-cases/execute-account-deletion.usecase';
import {
  OwnerDeletionStrategy,
  DefaultDeletionStrategyRegistry,
} from '@application/account-deletion/services/deletion-strategy';
import { EMAIL_SENDER_PORT } from '@application/notifications/ports/email-sender.port';
import { NodemailerEmailSender } from '@infrastructure/notifications/nodemailer-email-sender';

@Module({
  imports: [
    AuthModule,
    AuditLogsModule,
    ScheduleModule,
    MongooseModule.forFeature([
      { name: AccountDeletionRequestModel.name, schema: AccountDeletionRequestSchema },
      { name: AcademyModel.name, schema: AcademySchema },
      { name: BatchModel.name, schema: BatchSchema },
      { name: DeviceTokenModel.name, schema: DeviceTokenSchema },
      { name: EnquiryModel.name, schema: EnquirySchema },
      { name: EventModel.name, schema: EventSchema },
      { name: ExpenseCategoryModel.name, schema: ExpenseCategorySchema },
      { name: ExpenseModel.name, schema: ExpenseSchema },
      { name: FeeDueModel.name, schema: FeeDueSchema },
      { name: FeePaymentModel.name, schema: FeePaymentSchema },
      { name: GalleryPhotoModel.name, schema: GalleryPhotoSchema },
      { name: HolidayModel.name, schema: HolidaySchema },
      { name: ParentStudentLinkModel.name, schema: ParentStudentLinkSchema },
      { name: PasswordResetChallengeModel.name, schema: PasswordResetChallengeSchema },
      { name: PaymentRequestModel.name, schema: PaymentRequestSchema },
      { name: SessionModel.name, schema: SessionSchema },
      { name: StaffAttendanceModel.name, schema: StaffAttendanceSchema },
      { name: StudentAttendanceModel.name, schema: StudentAttendanceSchema },
      { name: StudentBatchModel.name, schema: StudentBatchSchema },
      { name: StudentModel.name, schema: StudentSchema },
      { name: SubscriptionModel.name, schema: SubscriptionSchema },
      { name: TransactionLogModel.name, schema: TransactionLogSchema },
      { name: UserModel.name, schema: UserSchema },
    ]),
  ],
  controllers: [AccountDeletionController],
  providers: [
    {
      provide: ACCOUNT_DELETION_REQUEST_REPOSITORY,
      useClass: MongoAccountDeletionRequestRepository,
    },
    { provide: EMAIL_SENDER_PORT, useClass: NodemailerEmailSender },
    AcademyTeardownService,
    OwnerDeletionStrategy,
    DefaultDeletionStrategyRegistry,
    RequestAccountDeletionUseCase,
    CancelAccountDeletionUseCase,
    ExecuteAccountDeletionUseCase,
    AccountDeletionSweeperCronService,
  ],
  exports: [ExecuteAccountDeletionUseCase],
})
export class AccountDeletionModule {}
