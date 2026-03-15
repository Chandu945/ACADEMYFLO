import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canViewAttendance, validateMonthKey } from '@domain/attendance/rules/attendance.rules';
import { AttendanceErrors } from '../../common/errors';
import type { MonthDailyCountsDto, MonthDailyCountDay } from '../dtos/attendance.dto';
import type { UserRole } from '@playconnect/contracts';

export interface GetMonthDailyCountsInput {
  actorUserId: string;
  actorRole: UserRole;
  month: string; // YYYY-MM
}

export class GetMonthDailyCountsUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly attendanceRepo: StudentAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
  ) {}

  async execute(
    input: GetMonthDailyCountsInput,
  ): Promise<Result<MonthDailyCountsDto, AppError>> {
    const roleCheck = canViewAttendance(input.actorRole);
    if (!roleCheck.allowed) {
      return err(AttendanceErrors.viewNotAllowed());
    }

    const monthCheck = validateMonthKey(input.month);
    if (!monthCheck.valid) {
      return err(AppErrorClass.validation(monthCheck.reason!));
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(AttendanceErrors.academyRequired());
    }

    const academyId = actor.academyId;

    // Parse month to get total days
    const parts = input.month.split('-');
    const year = parseInt(parts[0]!, 10);
    const monthNum = parseInt(parts[1]!, 10);
    const totalDaysInMonth = new Date(year, monthNum, 0).getDate();

    // Fetch all data in parallel (3 queries instead of 30+)
    const [totalStudents, absentRecords, holidays] = await Promise.all([
      this.studentRepo.countActiveByAcademy(academyId),
      this.attendanceRepo.findAbsentByAcademyAndMonth(academyId, input.month),
      this.holidayRepo.findByAcademyAndMonth(academyId, input.month),
    ]);

    // Build absent count map: date -> count
    const absentCountMap = new Map<string, number>();
    for (const record of absentRecords) {
      const count = absentCountMap.get(record.date) ?? 0;
      absentCountMap.set(record.date, count + 1);
    }

    // Build holiday set
    const holidaySet = new Set(holidays.map((h) => h.date));

    // Build day-by-day response
    const days: MonthDailyCountDay[] = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${input.month}-${String(d).padStart(2, '0')}`;
      days.push({
        date: dateStr,
        absentCount: absentCountMap.get(dateStr) ?? 0,
        isHoliday: holidaySet.has(dateStr),
      });
    }

    return ok({
      month: input.month,
      totalStudents,
      days,
    });
  }
}
