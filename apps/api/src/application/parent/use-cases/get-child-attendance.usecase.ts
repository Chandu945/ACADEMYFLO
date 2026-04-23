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
import { isValidMonthKey } from '@domain/attendance/value-objects/local-date.vo';
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

    const [presentRecords, holidays, _student, enrollments] = await Promise.all([
      this.attendanceRepo.findPresentByAcademyStudentAndMonth(
        link.academyId,
        input.studentId,
        input.month,
      ),
      this.holidayRepo.findByAcademyAndMonth(link.academyId, input.month),
      this.studentRepo.findById(input.studentId),
      this.studentBatchRepo.findByStudentId(input.studentId),
    ]);

    const holidayDates = holidays.map((h) => h.date);
    const enrolledBatchIds = enrollments.map((e) => e.batchId);
    const batches =
      enrolledBatchIds.length > 0 ? await this.batchRepo.findByIds(enrolledBatchIds) : [];

    // Group present records by batch.
    const presentByBatch = new Map<string, Set<string>>();
    for (const record of presentRecords) {
      let set = presentByBatch.get(record.batchId);
      if (!set) {
        set = new Set<string>();
        presentByBatch.set(record.batchId, set);
      }
      set.add(record.date);
    }

    let totalExpected = 0;
    let totalPresent = 0;
    const allMissedDates = new Set<string>();
    const perBatch: ChildBatchAttendanceBreakdown[] = batches.map((batch) => {
      const batchId = batch.id.toString();
      const expectedDates = scheduledDatesInMonth(input.month, batch.days, holidayDates);
      const presentSet = presentByBatch.get(batchId) ?? new Set<string>();
      const presentDates = expectedDates.filter((d) => presentSet.has(d));
      const absentDates = expectedDates.filter((d) => !presentSet.has(d));
      for (const d of absentDates) allMissedDates.add(d);
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

    return ok({
      studentId: input.studentId,
      month: input.month,
      absentDates: [...allMissedDates].sort(),
      holidayDates,
      presentCount: totalPresent,
      absentCount: Math.max(0, totalExpected - totalPresent),
      expectedCount: totalExpected,
      holidayCount: holidayDates.length,
      perBatch,
    });
  }
}
