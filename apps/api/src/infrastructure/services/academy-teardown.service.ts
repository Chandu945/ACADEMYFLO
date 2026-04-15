import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AcademyModel } from '../database/schemas/academy.schema';
import { BatchModel } from '../database/schemas/batch.schema';
import { DeviceTokenModel } from '../database/schemas/device-token.schema';
import { EnquiryModel } from '../database/schemas/enquiry.schema';
import { EventModel } from '../database/schemas/event.schema';
import { ExpenseCategoryModel } from '../database/schemas/expense-category.schema';
import { ExpenseModel } from '../database/schemas/expense.schema';
import { FeeDueModel } from '../database/schemas/fee-due.schema';
import { FeePaymentModel } from '../database/schemas/fee-payment.schema';
import { GalleryPhotoModel } from '../database/schemas/gallery-photo.schema';
import { HolidayModel } from '../database/schemas/holiday.schema';
import { ParentStudentLinkModel } from '../database/schemas/parent-student-link.schema';
import { PasswordResetChallengeModel } from '../database/schemas/password-reset-challenge.schema';
import { PaymentRequestModel } from '../database/schemas/payment-request.schema';
import { SessionModel } from '../database/schemas/session.schema';
import { StaffAttendanceModel } from '../database/schemas/staff-attendance.schema';
import { StudentAttendanceModel } from '../database/schemas/student-attendance.schema';
import { StudentBatchModel } from '../database/schemas/student-batch.schema';
import { StudentModel } from '../database/schemas/student.schema';
import { SubscriptionModel } from '../database/schemas/subscription.schema';
import { TransactionLogModel } from '../database/schemas/transaction-log.schema';
import { UserModel } from '../database/schemas/user.schema';

export interface AcademyTeardownReport {
  students: number;
  staff: number;
  parents: number;
  batches: number;
  studentBatches: number;
  parentStudentLinks: number;
  studentAttendance: number;
  staffAttendance: number;
  holidays: number;
  feeDues: number;
  feePayments: number;
  paymentRequests: number;
  transactionLogs: number;
  expenses: number;
  expenseCategories: number;
  enquiries: number;
  events: number;
  galleryPhotos: number;
  sessions: number;
  deviceTokens: number;
  passwordResetChallenges: number;
  subscriptionsCanceled: number;
  academiesTombstoned: number;
}

const ZERO_REPORT: AcademyTeardownReport = {
  students: 0,
  staff: 0,
  parents: 0,
  batches: 0,
  studentBatches: 0,
  parentStudentLinks: 0,
  studentAttendance: 0,
  staffAttendance: 0,
  holidays: 0,
  feeDues: 0,
  feePayments: 0,
  paymentRequests: 0,
  transactionLogs: 0,
  expenses: 0,
  expenseCategories: 0,
  enquiries: 0,
  events: 0,
  galleryPhotos: 0,
  sessions: 0,
  deviceTokens: 0,
  passwordResetChallenges: 0,
  subscriptionsCanceled: 0,
  academiesTombstoned: 0,
};

/**
 * Tenant teardown for an academy.
 *
 * Hard-deletes all academy-scoped operational data; soft-deletes the academy
 * row itself; retains audit_logs and subscription_payments collections for
 * compliance (tax/legal).
 *
 * Anonymization of users is handled separately by `UserRepository.anonymizeAndSoftDelete`
 * (called by the strategy), so they remain queryable from retained audit rows
 * but no longer expose PII.
 */
@Injectable()
export class AcademyTeardownService {
  private readonly logger = new Logger(AcademyTeardownService.name);

  constructor(
    @InjectModel(AcademyModel.name) private readonly academy: Model<AcademyModel>,
    @InjectModel(BatchModel.name) private readonly batch: Model<BatchModel>,
    @InjectModel(DeviceTokenModel.name) private readonly deviceToken: Model<DeviceTokenModel>,
    @InjectModel(EnquiryModel.name) private readonly enquiry: Model<EnquiryModel>,
    @InjectModel(EventModel.name) private readonly event: Model<EventModel>,
    @InjectModel(ExpenseCategoryModel.name) private readonly expenseCategory: Model<ExpenseCategoryModel>,
    @InjectModel(ExpenseModel.name) private readonly expense: Model<ExpenseModel>,
    @InjectModel(FeeDueModel.name) private readonly feeDue: Model<FeeDueModel>,
    @InjectModel(FeePaymentModel.name) private readonly feePayment: Model<FeePaymentModel>,
    @InjectModel(GalleryPhotoModel.name) private readonly galleryPhoto: Model<GalleryPhotoModel>,
    @InjectModel(HolidayModel.name) private readonly holiday: Model<HolidayModel>,
    @InjectModel(ParentStudentLinkModel.name) private readonly parentLink: Model<ParentStudentLinkModel>,
    @InjectModel(PasswordResetChallengeModel.name)
    private readonly passwordResetChallenge: Model<PasswordResetChallengeModel>,
    @InjectModel(PaymentRequestModel.name) private readonly paymentRequest: Model<PaymentRequestModel>,
    @InjectModel(SessionModel.name) private readonly session: Model<SessionModel>,
    @InjectModel(StaffAttendanceModel.name) private readonly staffAttendance: Model<StaffAttendanceModel>,
    @InjectModel(StudentAttendanceModel.name) private readonly studentAttendance: Model<StudentAttendanceModel>,
    @InjectModel(StudentBatchModel.name) private readonly studentBatch: Model<StudentBatchModel>,
    @InjectModel(StudentModel.name) private readonly student: Model<StudentModel>,
    @InjectModel(SubscriptionModel.name) private readonly subscription: Model<SubscriptionModel>,
    @InjectModel(TransactionLogModel.name) private readonly transactionLog: Model<TransactionLogModel>,
    @InjectModel(UserModel.name) private readonly user: Model<UserModel>,
  ) {}

  async teardown(academyId: string): Promise<AcademyTeardownReport> {
    const report: AcademyTeardownReport = { ...ZERO_REPORT };
    const filter = { academyId };

    // Look up the user IDs that belong to this academy first — we need them
    // to clean up auth-side collections (sessions, device tokens, password
    // reset challenges) which key on userId, not academyId.
    const usersInAcademy = await this.user.find(filter, { _id: 1, role: 1 }).lean().exec();
    const userIds = usersInAcademy.map((u) => String(u._id));

    report.students = (await this.student.deleteMany(filter)).deletedCount ?? 0;
    report.batches = (await this.batch.deleteMany(filter)).deletedCount ?? 0;
    report.studentBatches = (await this.studentBatch.deleteMany(filter)).deletedCount ?? 0;
    report.parentStudentLinks = (await this.parentLink.deleteMany(filter)).deletedCount ?? 0;
    report.studentAttendance = (await this.studentAttendance.deleteMany(filter)).deletedCount ?? 0;
    report.staffAttendance = (await this.staffAttendance.deleteMany(filter)).deletedCount ?? 0;
    report.holidays = (await this.holiday.deleteMany(filter)).deletedCount ?? 0;
    report.feeDues = (await this.feeDue.deleteMany(filter)).deletedCount ?? 0;
    report.feePayments = (await this.feePayment.deleteMany(filter)).deletedCount ?? 0;
    report.paymentRequests = (await this.paymentRequest.deleteMany(filter)).deletedCount ?? 0;
    report.transactionLogs = (await this.transactionLog.deleteMany(filter)).deletedCount ?? 0;
    report.expenses = (await this.expense.deleteMany(filter)).deletedCount ?? 0;
    report.expenseCategories = (await this.expenseCategory.deleteMany(filter)).deletedCount ?? 0;
    report.enquiries = (await this.enquiry.deleteMany(filter)).deletedCount ?? 0;
    report.events = (await this.event.deleteMany(filter)).deletedCount ?? 0;
    report.galleryPhotos = (await this.galleryPhoto.deleteMany(filter)).deletedCount ?? 0;

    // Cancel local subscription record (no Cashfree call — no recurring product)
    const subResult = await this.subscription.updateMany(
      { academyId },
      {
        $set: {
          paidEndAt: new Date(),
          pendingTierKey: null,
          pendingTierEffectiveAt: null,
          manualNotes: 'Canceled — academy deletion',
        },
      },
    );
    report.subscriptionsCanceled = subResult.modifiedCount ?? 0;

    if (userIds.length > 0) {
      report.sessions = (await this.session.deleteMany({ userId: { $in: userIds } })).deletedCount ?? 0;
      report.deviceTokens = (await this.deviceToken.deleteMany({ userId: { $in: userIds } })).deletedCount ?? 0;
      report.passwordResetChallenges =
        (await this.passwordResetChallenge.deleteMany({ userId: { $in: userIds } })).deletedCount ?? 0;
    }

    // Tombstone the academy (soft delete). Audit logs + subscription payments
    // remain referentially intact for compliance.
    const academyResult = await this.academy.updateOne(
      { _id: academyId },
      {
        $set: {
          deletedAt: new Date(),
          status: 'DELETED',
        },
      },
    );
    report.academiesTombstoned = academyResult.modifiedCount ?? 0;

    report.staff = usersInAcademy.filter((u) => u['role'] === 'STAFF').length;
    report.parents = usersInAcademy.filter((u) => u['role'] === 'PARENT').length;

    this.logger.log(
      `Academy teardown complete for ${academyId}: ${JSON.stringify(report)}`,
    );
    return report;
  }
}
