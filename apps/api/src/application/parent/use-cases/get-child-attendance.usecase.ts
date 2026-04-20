import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import { canViewOwnChildren } from '@domain/parent/rules/parent.rules';
import { isValidMonthKey, getDaysInMonth, getAllDatesInMonth } from '@domain/attendance/value-objects/local-date.vo';
import { ParentErrors } from '../../common/errors';
import type { ChildAttendanceSummaryDto } from '../dtos/parent.dto';
import type { UserRole } from '@academyflo/contracts';

export interface GetChildAttendanceInput {
  parentUserId: string;
  parentRole: UserRole;
  studentId: string;
  month: string;
}

/**
 * Calculate the effective number of countable days in a month for a student,
 * considering their joining date and today's date.
 */
function getEffectiveDays(month: string, joiningDate: string | Date | null | undefined): number {
  const totalDays = getDaysInMonth(month);
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const mon = Number(monthStr) - 1; // 0-indexed

  // First day of the month
  let startDay = 1;

  // If the student joined during this month, start from joining date
  if (joiningDate) {
    const jd = new Date(joiningDate);
    if (jd.getFullYear() === year && jd.getMonth() === mon) {
      startDay = jd.getDate();
    } else if (jd.getFullYear() > year || (jd.getFullYear() === year && jd.getMonth() > mon)) {
      // Student hasn't joined yet during this month
      return 0;
    }
  }

  // Don't count future days
  const now = new Date();
  let endDay = totalDays;
  if (now.getFullYear() === year && now.getMonth() === mon) {
    endDay = Math.min(totalDays, now.getDate());
  } else if (now.getFullYear() < year || (now.getFullYear() === year && now.getMonth() < mon)) {
    // This month is in the future
    return 0;
  }

  return Math.max(0, endDay - startDay + 1);
}

export class GetChildAttendanceUseCase {
  constructor(
    private readonly linkRepo: ParentStudentLinkRepository,
    private readonly attendanceRepo: StudentAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
    private readonly studentRepo: StudentRepository,
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

    const [presentRecords, holidays, student] = await Promise.all([
      // Records now represent PRESENT (presence-only model)
      this.attendanceRepo.findPresentByAcademyStudentAndMonth(
        link.academyId,
        input.studentId,
        input.month,
      ),
      this.holidayRepo.findByAcademyAndMonth(link.academyId, input.month),
      this.studentRepo.findById(input.studentId),
    ]);

    const effectiveDays = getEffectiveDays(input.month, student?.joiningDate);
    const presentDates = presentRecords.map((r) => r.date);
    const holidayDates = holidays.map((h) => h.date);
    const holidayDateSet = new Set(holidayDates);
    const presentCount = presentDates.length;
    const holidayCount = holidayDates.length;
    const overlapCount = presentDates.filter((d) => holidayDateSet.has(d)).length;
    const absentCount = Math.max(0, effectiveDays - presentCount - holidayCount + overlapCount);

    // Compute absent dates = all dates in month minus present minus holidays
    const allDates = getAllDatesInMonth(input.month);
    const presentSet = new Set(presentDates);
    const absentDates = allDates.filter((d) => !presentSet.has(d) && !holidayDateSet.has(d));

    return ok({
      studentId: input.studentId,
      month: input.month,
      absentDates,
      holidayDates,
      presentCount,
      absentCount,
      holidayCount,
    });
  }
}
