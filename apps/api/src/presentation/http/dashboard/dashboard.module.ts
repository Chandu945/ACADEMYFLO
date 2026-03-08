import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { AuthModule } from '../auth/auth.module';
import { AcademyOnboardingModule } from '../academy-onboarding/academy-onboarding.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { StudentModel, StudentSchema } from '@infrastructure/database/schemas/student.schema';
import { FeeDueModel, FeeDueSchema } from '@infrastructure/database/schemas/fee-due.schema';
import {
  PaymentRequestModel,
  PaymentRequestSchema,
} from '@infrastructure/database/schemas/payment-request.schema';
import {
  TransactionLogModel,
  TransactionLogSchema,
} from '@infrastructure/database/schemas/transaction-log.schema';
import {
  StudentAttendanceModel,
  StudentAttendanceSchema,
} from '@infrastructure/database/schemas/student-attendance.schema';
import { MongoStudentRepository } from '@infrastructure/repositories/mongo-student.repository';
import { MongoFeeDueRepository } from '@infrastructure/repositories/mongo-fee-due.repository';
import { MongoPaymentRequestRepository } from '@infrastructure/repositories/mongo-payment-request.repository';
import { MongoTransactionLogRepository } from '@infrastructure/repositories/mongo-transaction-log.repository';
import { MongoStudentAttendanceRepository } from '@infrastructure/repositories/mongo-student-attendance.repository';
import { MongoExpenseRepository } from '@infrastructure/repositories/mongo-expense.repository';
import { ExpenseModel, ExpenseSchema } from '@infrastructure/database/schemas/expense.schema';
import { STUDENT_REPOSITORY } from '@domain/student/ports/student.repository';
import { FEE_DUE_REPOSITORY } from '@domain/fee/ports/fee-due.repository';
import { PAYMENT_REQUEST_REPOSITORY } from '@domain/fee/ports/payment-request.repository';
import { TRANSACTION_LOG_REPOSITORY } from '@domain/fee/ports/transaction-log.repository';
import { STUDENT_ATTENDANCE_REPOSITORY } from '@domain/attendance/ports/student-attendance.repository';
import { EXPENSE_REPOSITORY } from '@domain/expense/ports/expense.repository';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import { GetOwnerDashboardKpisUseCase } from '@application/dashboard/use-cases/get-owner-dashboard-kpis.usecase';
import { GetMonthlyChartUseCase } from '@application/dashboard/use-cases/get-monthly-chart.usecase';
import { GetBirthdaysUseCase } from '@application/dashboard/use-cases/get-birthdays.usecase';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import type { TransactionLogRepository } from '@domain/fee/ports/transaction-log.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { ExpenseRepository } from '@domain/expense/ports/expense.repository';

@Module({
  imports: [
    AuthModule,
    AcademyOnboardingModule,
    SubscriptionModule,
    MongooseModule.forFeature([
      { name: StudentModel.name, schema: StudentSchema },
      { name: FeeDueModel.name, schema: FeeDueSchema },
      { name: PaymentRequestModel.name, schema: PaymentRequestSchema },
      { name: TransactionLogModel.name, schema: TransactionLogSchema },
      { name: StudentAttendanceModel.name, schema: StudentAttendanceSchema },
      { name: ExpenseModel.name, schema: ExpenseSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [
    { provide: STUDENT_REPOSITORY, useClass: MongoStudentRepository },
    { provide: FEE_DUE_REPOSITORY, useClass: MongoFeeDueRepository },
    { provide: PAYMENT_REQUEST_REPOSITORY, useClass: MongoPaymentRequestRepository },
    { provide: TRANSACTION_LOG_REPOSITORY, useClass: MongoTransactionLogRepository },
    { provide: STUDENT_ATTENDANCE_REPOSITORY, useClass: MongoStudentAttendanceRepository },
    { provide: EXPENSE_REPOSITORY, useClass: MongoExpenseRepository },
    {
      provide: 'GET_OWNER_DASHBOARD_KPIS_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        studentRepo: StudentRepository,
        prRepo: PaymentRequestRepository,
        tlRepo: TransactionLogRepository,
        fdRepo: FeeDueRepository,
        attRepo: StudentAttendanceRepository,
        expRepo: ExpenseRepository,
      ) => new GetOwnerDashboardKpisUseCase(userRepo, studentRepo, prRepo, tlRepo, fdRepo, attRepo, expRepo),
      inject: [
        USER_REPOSITORY,
        STUDENT_REPOSITORY,
        PAYMENT_REQUEST_REPOSITORY,
        TRANSACTION_LOG_REPOSITORY,
        FEE_DUE_REPOSITORY,
        STUDENT_ATTENDANCE_REPOSITORY,
        EXPENSE_REPOSITORY,
      ],
    },
    {
      provide: 'GET_MONTHLY_CHART_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        tlRepo: TransactionLogRepository,
        expRepo: ExpenseRepository,
      ) => new GetMonthlyChartUseCase(userRepo, tlRepo, expRepo),
      inject: [USER_REPOSITORY, TRANSACTION_LOG_REPOSITORY, EXPENSE_REPOSITORY],
    },
    {
      provide: 'GET_BIRTHDAYS_USE_CASE',
      useFactory: (
        userRepo: UserRepository,
        studentRepo: StudentRepository,
      ) => new GetBirthdaysUseCase(userRepo, studentRepo),
      inject: [USER_REPOSITORY, STUDENT_REPOSITORY],
    },
  ],
})
export class DashboardModule {}
