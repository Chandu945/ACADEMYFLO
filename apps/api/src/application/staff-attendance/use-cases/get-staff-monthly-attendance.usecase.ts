import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StaffAttendanceRepository } from '@domain/staff-attendance/ports/staff-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import { canViewStaffAttendance } from '@domain/staff-attendance/rules/staff-attendance.rules';
import {
  isValidMonthKey,
  getTodayLocalDate,
  getAllDatesInMonth,
} from '@domain/attendance/value-objects/local-date.vo';
import { StaffAttendanceErrors } from '../../common/errors';
import type { StaffMonthlyAttendanceDto } from '../dtos/staff-attendance.dto';
import type { UserRole } from '@academyflo/contracts';

export interface GetStaffMonthlyAttendanceInput {
  actorUserId: string;
  actorRole: UserRole;
  staffUserId: string;
  month: string;
}

export class GetStaffMonthlyAttendanceUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly staffAttendanceRepo: StaffAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
  ) {}

  async execute(
    input: GetStaffMonthlyAttendanceInput,
  ): Promise<Result<StaffMonthlyAttendanceDto, AppError>> {
    const roleCheck = canViewStaffAttendance(input.actorRole);
    if (!roleCheck.allowed) {
      return err(StaffAttendanceErrors.viewNotAllowed());
    }

    if (!isValidMonthKey(input.month)) {
      return err(AppErrorClass.validation('Month must be a valid YYYY-MM format'));
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(StaffAttendanceErrors.academyRequired());
    }

    const staff = await this.userRepo.findById(input.staffUserId);
    if (!staff || staff.role !== 'STAFF') {
      return err(StaffAttendanceErrors.viewNotAllowed());
    }
    if (staff.academyId !== actor.academyId) {
      return err(StaffAttendanceErrors.viewNotAllowed());
    }

    const [allPresent, holidays] = await Promise.all([
      this.staffAttendanceRepo.findPresentByAcademyAndMonth(actor.academyId, input.month),
      this.holidayRepo.findByAcademyAndMonth(actor.academyId, input.month),
    ]);

    const today = getTodayLocalDate();
    // Past holidays only — future holidays shouldn't shrink past absences.
    const pastHolidayDates = holidays.filter((h) => h.date <= today).map((h) => h.date);
    const holidaySet = new Set(pastHolidayDates);

    // Expected dates = all calendar dates in month up to today, minus past
    // holidays. (Staff are expected every academy day; if you later add a
    // weekly schedule for staff, filter here.)
    const expectedDates = getAllDatesInMonth(input.month).filter(
      (d) => d <= today && !holidaySet.has(d),
    );
    const expectedSet = new Set(expectedDates);

    // This staff's present records, capped to past dates.
    const presentDates = allPresent
      .filter((r) => r.staffUserId === input.staffUserId && r.date <= today)
      .map((r) => r.date);
    const presentSet = new Set(presentDates);

    const presentDays = presentDates.filter((d) => expectedSet.has(d)).length;
    const absentDates = expectedDates.filter((d) => !presentSet.has(d));
    const absentDays = absentDates.length;

    return ok({
      staffUserId: input.staffUserId,
      fullName: staff.fullName,
      month: input.month,
      expectedDays: expectedDates.length,
      presentDays,
      absentDays,
      holidayCount: pastHolidayDates.length,
      presentDates: [...new Set(presentDates)].sort(),
      absentDates: absentDates.sort(),
      holidayDates: pastHolidayDates.sort(),
    });
  }
}
