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
import {
  buildLateFeeConfigFromAcademy,
  buildEffectiveLateFeeConfig,
} from '../../fee/common/late-fee';

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
      todayScheduledCountRaw,
      todayAbsentRecordedCount,
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
      this.feeDueRepo.listByAcademyMonthAndStatuses(academyId, currentMonthKey, [
        'UPCOMING',
        'DUE',
      ]),
      this.academyRepo.findById(academyId),
      // Default-present model: scheduled = students whose batch runs today.
      // Drives the % present tile so it starts at 100% (= scheduled / scheduled)
      // before anyone is marked absent, and drops only on explicit ABSENT marks.
      this.studentRepo.countScheduledStudentsByAcademyAndDate(academyId, today),
      // Strict day-level absent count: only students who are absent in
      // EVERY scheduled batch today. A student absent in their morning
      // batch but present (or unmarked → default-present) in their
      // evening batch is treated as a "partial" present day — matching
      // get-student-monthly-attendance's day-level semantics. Without
      // this, the dashboard would report the partial student as absent
      // while the student's own monthly view counted them as present.
      this.attendanceRepo.countDistinctStudentsAbsentInAllScheduledBatchesByAcademyAndDate(
        academyId,
        today,
      ),
      this.expenseRepo.sumByAcademyAndDateRange(academyId, input.from, input.to),
      // Cash bucketing: late fee collected during the picked range, regardless
      // of which due-month it was for. Mirrors `totalCollected` (transaction
      // log createdAt) so both tiles answer "what came in this month?"
      this.feeDueRepo.sumLateFeeCollectedByAcademyAndDateRange(academyId, input.from, input.to),
      this.feeDueRepo.countOverdueByAcademy(academyId, today),
      this.holidayRepo.findByAcademyAndDate(academyId, today).then((h) => h !== null),
    ]);

    // Compute total pending = base + current late fee per due. The helper
    // enforces L1 (live disable kills late fee for everyone) and M1 (when
    // late fee is enabled, snapshot locks the amount).
    const liveConfig = buildLateFeeConfigFromAcademy(academy);
    let totalPendingAmount = 0;
    for (const due of unpaidDuesForMonth) {
      const effectiveConfig = buildEffectiveLateFeeConfig(due.lateFeeConfigSnapshot, liveConfig);
      let lateFee = 0;
      if (effectiveConfig) {
        const computed = computeLateFee(due.dueDate, today, effectiveConfig);
        if (Number.isFinite(computed)) lateFee = computed;
      }
      totalPendingAmount += due.amount + lateFee;
    }

    // Default-present model: the denominator is "students scheduled today"
    // (`todayScheduledCount`). On a declared holiday no student is scheduled,
    // so both scheduled and absent collapse to 0 and the tile reads as
    // "Holiday today" rather than a panic-grade absent count.
    //
    // Pre-fix the dashboard reported `absent = totalStudents - present`,
    // which on a Sunday-batch academy with no Sunday classes still claimed
    // every active student was absent. The scheduled-today query bakes the
    // batch.days intersection in, fixing both the weekend and holiday cases
    // with the same expression. (Replaces the old "Known limitation" note.)
    const todayScheduledCount = isHolidayToday ? 0 : todayScheduledCountRaw;
    const todayAbsentCount = isHolidayToday
      ? 0
      : Math.min(todayAbsentRecordedCount, todayScheduledCount);
    // Default-present: unmarked + scheduled students are assumed present.
    // Subtract only the explicit ABSENT records from the scheduled pool.
    const todayPresentCount = Math.max(0, todayScheduledCount - todayAbsentCount);

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
      todayScheduledCount,
      totalExpenses,
      lateFeeCollected,
      overdueCount,
      isHolidayToday,
    });
  }
}
