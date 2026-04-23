import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentBatchRepository } from '@domain/batch/ports/student-batch.repository';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import { canViewAttendance } from '@domain/attendance/rules/attendance.rules';
import { isValidMonthKey } from '@domain/attendance/value-objects/local-date.vo';
import { scheduledDatesInMonth } from '@domain/attendance/value-objects/batch-schedule.vo';
import { AttendanceErrors } from '../../common/errors';
import type {
  StudentMonthlyAttendanceDto,
  StudentBatchAttendanceBreakdown,
} from '../dtos/attendance.dto';
import type { UserRole } from '@academyflo/contracts';

export interface GetStudentMonthlyAttendanceInput {
  actorUserId: string;
  actorRole: UserRole;
  studentId: string;
  month: string;
}

export class GetStudentMonthlyAttendanceUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly attendanceRepo: StudentAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
    private readonly studentBatchRepo: StudentBatchRepository,
    private readonly batchRepo: BatchRepository,
  ) {}

  async execute(
    input: GetStudentMonthlyAttendanceInput,
  ): Promise<Result<StudentMonthlyAttendanceDto, AppError>> {
    const roleCheck = canViewAttendance(input.actorRole);
    if (!roleCheck.allowed) {
      return err(AttendanceErrors.viewNotAllowed());
    }

    if (!isValidMonthKey(input.month)) {
      return err(AppErrorClass.validation('Month must be a valid YYYY-MM format'));
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(AttendanceErrors.academyRequired());
    }

    // Allow historical lookup for any student (even INACTIVE/LEFT)
    const student = await this.studentRepo.findById(input.studentId);
    if (!student || student.isDeleted()) {
      return err(AttendanceErrors.studentNotFound(input.studentId));
    }

    if (student.academyId !== actor.academyId) {
      return err(AttendanceErrors.studentNotInAcademy());
    }

    const [presentRecords, holidays, enrollments] = await Promise.all([
      this.attendanceRepo.findPresentByAcademyStudentAndMonth(
        actor.academyId,
        input.studentId,
        input.month,
      ),
      this.holidayRepo.findByAcademyAndMonth(actor.academyId, input.month),
      this.studentBatchRepo.findByStudentId(input.studentId),
    ]);

    const holidayDates = holidays.map((h) => h.date);
    const studentBatchIds = enrollments.map((e) => e.batchId);
    const batches =
      studentBatchIds.length > 0 ? await this.batchRepo.findByIds(studentBatchIds) : [];

    // Group present records by batch for per-batch breakdown.
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
    const perBatch: StudentBatchAttendanceBreakdown[] = batches.map((batch) => {
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
        expectedCount: expectedDates.length,
        presentCount: presentDates.length,
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
