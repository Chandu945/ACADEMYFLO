import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import type { TransactionLogRepository } from '@domain/fee/ports/transaction-log.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { ExpenseRepository } from '@domain/expense/ports/expense.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import { canViewDashboard } from '@domain/fee/rules/fee.rules';
import { FeeErrors } from '../../common/errors';
import { formatLocalDate, toMonthKeyFromDate } from '@shared/date-utils';
import type { OwnerDashboardKpisDto } from '../dtos/owner-dashboard.dto';
import type { UserRole } from '@academyflo/contracts';

export interface GetOwnerDashboardKpisInput {
  actorUserId: string;
  actorRole: UserRole;
  from: Date;
  to: Date;
}

export class GetOwnerDashboardKpisUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly paymentRequestRepo: PaymentRequestRepository,
    private readonly transactionLogRepo: TransactionLogRepository,
    private readonly feeDueRepo: FeeDueRepository,
    private readonly attendanceRepo: StudentAttendanceRepository,
    private readonly expenseRepo: ExpenseRepository,
    private readonly holidayRepo: HolidayRepository,
  ) {}

  async execute(
    input: GetOwnerDashboardKpisInput,
  ): Promise<Result<OwnerDashboardKpisDto, AppError>> {
    const check = canViewDashboard(input.actorRole);
    if (!check.allowed) return err(FeeErrors.dashboardNotAllowed());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(FeeErrors.academyRequired());

    const academyId = user.academyId;
    const today = formatLocalDate(new Date());
    const currentMonthKey = toMonthKeyFromDate(input.from);

    const [
      totalStudents,
      newAdmissions,
      inactiveStudents,
      pendingPaymentRequests,
      totalCollected,
      dueStudentsCount,
      totalPendingAmount,
      todayPresentCount,
      totalExpenses,
      lateFeeCollected,
      overdueCount,
      isHolidayToday,
    ] = await Promise.all([
      this.studentRepo.countActiveByAcademy(academyId),
      this.studentRepo.countNewAdmissionsByAcademyAndDateRange(academyId, input.from, input.to),
      this.studentRepo.countInactiveByAcademy(academyId),
      this.paymentRequestRepo.countPendingByAcademy(academyId),
      this.transactionLogRepo.sumRevenueByAcademyAndDateRange(academyId, input.from, input.to),
      this.feeDueRepo.countDistinctUnpaidStudentsByAcademyAndMonth(academyId, currentMonthKey),
      this.feeDueRepo.sumUnpaidAmountByAcademy(academyId),
      // Records now represent PRESENT students (presence-only model)
      this.attendanceRepo.countPresentByAcademyAndDate(academyId, today),
      this.expenseRepo.sumByAcademyAndDateRange(academyId, input.from, input.to),
      this.feeDueRepo.sumLateFeeCollectedByAcademyAndMonth(academyId, currentMonthKey),
      this.feeDueRepo.countOverdueByAcademy(academyId, today),
      this.holidayRepo.findByAcademyAndDate(academyId, today).then((h) => h !== null),
    ]);

    const todayAbsentCount = Math.max(0, totalStudents - todayPresentCount);

    return ok({
      totalStudents,
      newAdmissions,
      inactiveStudents,
      pendingPaymentRequests,
      totalCollected,
      totalPendingAmount,
      todayAbsentCount,
      dueStudentsCount,
      todayPresentCount,
      totalExpenses,
      lateFeeCollected,
      overdueCount,
      isHolidayToday,
    });
  }
}
