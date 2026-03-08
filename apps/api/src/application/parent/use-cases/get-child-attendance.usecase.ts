import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import { canViewOwnChildren } from '@domain/parent/rules/parent.rules';
import { isValidMonthKey, getDaysInMonth } from '@domain/attendance/value-objects/local-date.vo';
import { ParentErrors } from '../../common/errors';
import type { ChildAttendanceSummaryDto } from '../dtos/parent.dto';
import type { UserRole } from '@playconnect/contracts';

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

    const [absentRecords, holidays] = await Promise.all([
      this.attendanceRepo.findAbsentByAcademyStudentAndMonth(
        link.academyId,
        input.studentId,
        input.month,
      ),
      this.holidayRepo.findByAcademyAndMonth(link.academyId, input.month),
    ]);

    const daysInMonth = getDaysInMonth(input.month);
    const absentCount = absentRecords.length;
    const holidayCount = holidays.length;
    const presentCount = Math.max(0, daysInMonth - absentCount - holidayCount);

    return ok({
      studentId: input.studentId,
      month: input.month,
      presentCount,
      absentCount,
      holidayCount,
    });
  }
}
