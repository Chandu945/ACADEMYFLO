import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import { canViewOwnChildren } from '@domain/parent/rules/parent.rules';
import { isValidMonthKey, getTodayLocalDate } from '@domain/attendance/value-objects/local-date.vo';
import { scheduledDatesInMonth } from '@domain/attendance/value-objects/batch-schedule.vo';
import { ParentErrors } from '../../common/errors';
import type {
  ChildAttendanceSummaryDto,
  ChildBatchAttendanceBreakdown,
} from '../dtos/parent.dto';
import type { UserRole } from '@academyflo/contracts';

export interface GetChildAttendanceInput {
  parentUserId: string;
  parentRole: UserRole;
  studentId: string;
  month: string;
}

function toLocalDateKey(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export class GetChildAttendanceUseCase {
  constructor(
    private readonly linkRepo: ParentStudentLinkRepository,
    private readonly attendanceRepo: StudentAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
    private readonly studentRepo: StudentRepository,
    private readonly studentBatchRepo: StudentBatchRepository,
    private readonly batchRepo: BatchRepository,
  ) {}

  async execute(
    input: GetChildAttendanceInput,
  ): Promise<Result<ChildAttendanceSummaryDto, AppError>> {
    const check = canViewOwnChildren(input.parentRole);
    if (!check.allowed) return err(ParentErrors.childNotLinked());

    if (!isValidMonthKey(input.month)) {
      return err(AppErrorClass.validation('Month must be a valid YYYY-MM format'));
    }

    const link = await this.linkRepo.findByParentAndStudent(input.parentUserId, input.studentId);
    if (!link) return err(ParentErrors.childNotLinked());

    const [presentRecords, holidays, student, enrollments] = await Promise.all([
      this.attendanceRepo.findPresentByAcademyStudentAndMonth(
        link.academyId,
        input.studentId,
        input.month,
      ),
      this.holidayRepo.findByAcademyAndMonth(link.academyId, input.month),
      this.studentRepo.findById(input.studentId),
      this.studentBatchRepo.findByStudentId(input.studentId),
    ]);

    if (!student) return err(ParentErrors.childNotLinked());

    const holidayDates = holidays.map((h) => h.date);
    const enrolledBatchIds = enrollments.map((e) => e.batchId);
    const batches =
      enrolledBatchIds.length > 0 ? await this.batchRepo.findByIds(enrolledBatchIds) : [];

    // Group present records by batch (used by per-batch breakdown).
    const presentByBatch = new Map<string, Set<string>>();
    for (const record of presentRecords) {
      let set = presentByBatch.get(record.batchId);
      if (!set) {
        set = new Set<string>();
        presentByBatch.set(record.batchId, set);
      }
      set.add(record.date);
    }

    // Joining-date and per-batch enrollment-date caps — must mirror the
    // owner/staff use case so a parent and an owner see identical numbers
    // for the same student.
    const today = getTodayLocalDate();
    const monthStart = `${input.month}-01`;
    const studentJoinKey = toLocalDateKey(student.joiningDate);
    const studentEffectiveStart = studentJoinKey > monthStart ? studentJoinKey : monthStart;
    const enrolStartByBatch = new Map<string, string>();
    for (const enrol of enrollments) {
      const enrolKey = toLocalDateKey(enrol.assignedAt);
      enrolStartByBatch.set(
        enrol.batchId,
        enrolKey > studentEffectiveStart ? enrolKey : studentEffectiveStart,
      );
    }

    let totalExpected = 0;
    let totalPresent = 0;
    const expectedBatchesByDate = new Map<string, Set<string>>();
    const presentBatchesByDate = new Map<string, Set<string>>();
    const perBatch: ChildBatchAttendanceBreakdown[] = batches.map((batch) => {
      const batchId = batch.id.toString();
      const enrolStart = enrolStartByBatch.get(batchId) ?? studentEffectiveStart;
      const expectedDates = scheduledDatesInMonth(
        input.month,
        batch.days,
        holidayDates,
        today,
      ).filter((d) => d >= enrolStart);
      const presentSet = presentByBatch.get(batchId) ?? new Set<string>();
      const presentDates = expectedDates.filter((d) => presentSet.has(d));
      const absentDates = expectedDates.filter((d) => !presentSet.has(d));
      for (const d of expectedDates) {
        let set = expectedBatchesByDate.get(d);
        if (!set) {
          set = new Set();
          expectedBatchesByDate.set(d, set);
        }
        set.add(batchId);
      }
      for (const d of presentDates) {
        let set = presentBatchesByDate.get(d);
        if (!set) {
          set = new Set();
          presentBatchesByDate.set(d, set);
        }
        set.add(batchId);
      }
      totalExpected += expectedDates.length;
      totalPresent += presentDates.length;
      return {
        batchId,
        batchName: batch.batchName,
        presentCount: presentDates.length,
        expectedCount: expectedDates.length,
        presentDates,
        absentDates,
      };
    });

    // Day-level aggregates (lax: present in ANY batch on a day = present day).
    let presentDays = 0;
    let absentDays = 0;
    let partialDays = 0;
    const dayAbsentDates: string[] = [];
    for (const [date, expectedBatches] of expectedBatchesByDate) {
      const presentBatches = presentBatchesByDate.get(date);
      if (!presentBatches || presentBatches.size === 0) {
        absentDays++;
        dayAbsentDates.push(date);
      } else {
        presentDays++;
        if (presentBatches.size < expectedBatches.size) partialDays++;
      }
    }
    const expectedDays = expectedBatchesByDate.size;

    return ok({
      studentId: input.studentId,
      month: input.month,
      absentDates: dayAbsentDates.sort(),
      holidayDates,
      // Session-level (kept for backward compat).
      presentCount: totalPresent,
      absentCount: Math.max(0, totalExpected - totalPresent),
      expectedCount: totalExpected,
      holidayCount: holidayDates.length,
      // Day-level — the actionable numbers, identical to owner/staff views.
      expectedDays,
      presentDays,
      absentDays,
      partialDays,
      perBatch,
    });
  }
}
