import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { FeeDueRepository } from '@domain/fee/ports/fee-due.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import { canViewOwnChildren } from '@domain/parent/rules/parent.rules';
import { scheduledDatesInMonth } from '@domain/attendance/value-objects/batch-schedule.vo';
import { ParentErrors } from '../../common/errors';
import type { ChildSummaryDto } from '../dtos/parent.dto';
import type { UserRole } from '@academyflo/contracts';

export interface GetMyChildrenInput {
  parentUserId: string;
  parentRole: UserRole;
}

/** Shift "YYYY-MM" by `delta` months (negative goes back). */
function monthKeyOffset(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12 + 12) % 12;
  return `${ny}-${String(nm + 1).padStart(2, '0')}`;
}

export class GetMyChildrenUseCase {
  constructor(
    private readonly linkRepo: ParentStudentLinkRepository,
    private readonly studentRepo: StudentRepository,
    private readonly attendanceRepo: StudentAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
    private readonly feeDueRepo: FeeDueRepository,
    private readonly studentBatchRepo: StudentBatchRepository,
    private readonly batchRepo: BatchRepository,
  ) {}

  async execute(input: GetMyChildrenInput): Promise<Result<ChildSummaryDto[], AppError>> {
    const check = canViewOwnChildren(input.parentRole);
    if (!check.allowed) return err(ParentErrors.childNotLinked());

    const links = await this.linkRepo.findByParentUserId(input.parentUserId);
    if (links.length === 0) return ok([]);

    const studentIds = links.map((l) => l.studentId);
    const students = await this.studentRepo.findByIds(studentIds);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Pre-load holidays per academy (one cache key per academy in scope).
    const academyIds = [...new Set(links.map((l) => l.academyId))];
    const holidayDatesByAcademy = new Map<string, string[]>();
    await Promise.all(
      academyIds.map(async (aid) => {
        const holidays = await this.holidayRepo.findByAcademyAndMonth(aid, currentMonth);
        holidayDatesByAcademy.set(aid, holidays.map((h) => h.date));
      }),
    );

    const studentAcademy = new Map(links.map((l) => [l.studentId, l.academyId]));

    const summaries: ChildSummaryDto[] = await Promise.all(
      students.map(async (s) => {
        const sid = s.id.toString();
        const academyId = studentAcademy.get(sid) ?? s.academyId;
        const holidayDates = holidayDatesByAcademy.get(academyId) ?? [];
        let currentMonthAttendancePercent: number | null = null;

        try {
          const [presentRecords, enrollments] = await Promise.all([
            this.attendanceRepo.findPresentByAcademyStudentAndMonth(
              academyId,
              sid,
              currentMonth,
            ),
            this.studentBatchRepo.findByStudentId(sid),
          ]);

          if (enrollments.length > 0) {
            const batches = await this.batchRepo.findByIds(enrollments.map((e) => e.batchId));
            const expectedSessions = batches.reduce(
              (sum, b) => sum + scheduledDatesInMonth(currentMonth, b.days, holidayDates).length,
              0,
            );
            if (expectedSessions > 0) {
              currentMonthAttendancePercent = Math.round(
                (presentRecords.length / expectedSessions) * 100,
              );
            } else {
              currentMonthAttendancePercent = null;
            }
          }
        } catch {
          // If attendance/enrollment data unavailable, leave as null.
        }

        // Surface the OLDEST unpaid fee (DUE or UPCOMING) — older dues take
        // priority so the backlog gets cleared in order and late fees apply
        // to the right month. Falls back to current-month fee if no backlog.
        let currentMonthFeeDueId: string | null = null;
        let currentMonthFeeAmount: number | null = null;
        let currentMonthFeeStatus: ChildSummaryDto['currentMonthFeeStatus'] = null;
        let currentMonthFeeMonthKey: string | null = null;
        let totalUnpaidMonths = 0;
        let totalUnpaidAmount = 0;
        try {
          // Look back 24 months — generous safety margin for any realistic
          // backlog. Anything older than that is unlikely to be settled
          // through the app and probably needs admin intervention.
          const fromMonth = monthKeyOffset(currentMonth, -24);
          const fees = await this.feeDueRepo.listByStudentAndRange(
            academyId,
            sid,
            fromMonth,
            currentMonth,
          );
          // listByStudentAndRange returns sorted ASC by monthKey already.
          const unpaid = fees.filter(
            (f) => f.status === 'DUE' || f.status === 'UPCOMING',
          );
          totalUnpaidMonths = unpaid.length;
          totalUnpaidAmount = unpaid.reduce(
            (sum, f) => sum + f.amount + (f.lateFeeApplied ?? 0),
            0,
          );
          const oldest = unpaid[0];
          if (oldest) {
            currentMonthFeeDueId = oldest.id.toString();
            currentMonthFeeAmount = oldest.amount + (oldest.lateFeeApplied ?? 0);
            currentMonthFeeStatus = oldest.status;
            currentMonthFeeMonthKey = oldest.monthKey;
          }
        } catch {
          // If fee due unavailable, keep nulls — UI falls back to monthlyFee.
        }

        return {
          studentId: sid,
          fullName: s.fullName,
          status: s.status,
          monthlyFee: s.monthlyFee,
          academyId: s.academyId,
          currentMonthAttendancePercent,
          currentMonthFeeDueId,
          currentMonthFeeAmount,
          currentMonthFeeStatus,
          currentMonthFeeMonthKey,
          totalUnpaidMonths,
          totalUnpaidAmount,
        };
      }),
    );

    return ok(summaries);
  }
}
