import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import type { TransactionLogRepository } from '@domain/fee/ports/transaction-log.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { ExpenseRepository } from '@domain/expense/ports/expense.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import { canViewDashboard } from '@domain/fee/rules/fee.rules';
import { FeeErrors } from '../../common/errors';
import { formatLocalDate, toMonthKeyFromDate } from '@shared/date-utils';
import type { OwnerDashboardKpisDto } from '../dtos/owner-dashboard.dto';
import type { UserRole } from '@academyflo/contracts';
import { computeLateFee } from '@academyflo/contracts';
import { buildLateFeeConfigFromAcademy } from '../../fee/common/late-fee';

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
    private readonly academyRepo: AcademyRepository,
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
      unpaidDuesForMonth,
      academy,
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
      // Pull the actual unpaid dues so we can compute total payable (base +
      // current late fee) per due. The previous `sumUnpaidAmountByAcademyAndMonth`
      // returned base only, leaving the dashboard tile inconsistent with the
      // parent-facing total and the overdue-students report. Per-month list is
      // small (low hundreds even at scale) so JS-side iteration is fine.
      this.feeDueRepo.listByAcademyMonthAndStatuses(academyId, currentMonthKey, ['UPCOMING', 'DUE']),
      this.academyRepo.findById(academyId),
      // Distinct students — a two-batch student is one human, not two presences.
      this.attendanceRepo.countDistinctStudentsPresentByAcademyAndDate(academyId, today),
      this.expenseRepo.sumByAcademyAndDateRange(academyId, input.from, input.to),
      // Cash bucketing: late fee collected during the picked range, regardless
      // of which due-month it was for. Mirrors `totalCollected` (transaction
      // log createdAt) so both tiles answer "what came in this month?"
      this.feeDueRepo.sumLateFeeCollectedByAcademyAndDateRange(academyId, input.from, input.to),
      this.feeDueRepo.countOverdueByAcademy(academyId, today),
      this.holidayRepo.findByAcademyAndDate(academyId, today).then((h) => h !== null),
    ]);

    // Compute total pending = base + current late fee per due. Snapshotted
    // config wins for dues that have crossed grace; live config is the
    // fallback for not-yet-overdue UPCOMING rows.
    const liveConfig = buildLateFeeConfigFromAcademy(academy);
    let totalPendingAmount = 0;
    for (const due of unpaidDuesForMonth) {
      const effectiveConfig = due.lateFeeConfigSnapshot ?? liveConfig;
      let lateFee = 0;
      if (effectiveConfig) {
        const computed = computeLateFee(due.dueDate, today, effectiveConfig);
        if (Number.isFinite(computed)) lateFee = computed;
      }
      totalPendingAmount += due.amount + lateFee;
    }

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
