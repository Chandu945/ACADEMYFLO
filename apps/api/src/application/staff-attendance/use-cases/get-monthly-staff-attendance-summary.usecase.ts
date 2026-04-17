import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StaffAttendanceRepository } from '@domain/staff-attendance/ports/staff-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import { canViewStaffAttendance } from '@domain/staff-attendance/rules/staff-attendance.rules';
import { isValidMonthKey, getDaysInMonth } from '@domain/attendance/value-objects/local-date.vo';
import { StaffAttendanceErrors } from '../../common/errors';
import type { MonthlyStaffAttendanceSummaryItem } from '../dtos/staff-attendance.dto';
import type { UserRole } from '@playconnect/contracts';

export interface GetMonthlyStaffAttendanceSummaryInput {
  actorUserId: string;
  actorRole: UserRole;
  month: string;
  page: number;
  pageSize: number;
}

export interface GetMonthlyStaffAttendanceSummaryOutput {
  data: MonthlyStaffAttendanceSummaryItem[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export class GetMonthlyStaffAttendanceSummaryUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly staffAttendanceRepo: StaffAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
  ) {}

  async execute(
    input: GetMonthlyStaffAttendanceSummaryInput,
  ): Promise<Result<GetMonthlyStaffAttendanceSummaryOutput, AppError>> {
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

    // Get ACTIVE staff paginated
    const { users: staffUsers, total } = await this.userRepo.listByAcademyAndRole(
      actor.academyId,
      'STAFF',
      input.page,
      input.pageSize,
    );

    // Get all present records and holidays for the month in bulk
    const [allPresent, holidays] = await Promise.all([
      this.staffAttendanceRepo.findAbsentByAcademyAndMonth(actor.academyId, input.month),
      this.holidayRepo.findByAcademyAndMonth(actor.academyId, input.month),
    ]);

    const daysInMonth = getDaysInMonth(input.month);
    const holidayCount = holidays.length;
    const holidayDateSet = new Set(holidays.map((h) => h.date));

    // Build present dates per staff (to compute overlap with holidays)
    const presentDatesMap = new Map<string, string[]>();
    for (const record of allPresent) {
      const dates = presentDatesMap.get(record.staffUserId) ?? [];
      dates.push(record.date);
      presentDatesMap.set(record.staffUserId, dates);
    }

    const data: MonthlyStaffAttendanceSummaryItem[] = staffUsers.map((s) => {
      const presentDatesForStaff = presentDatesMap.get(s.id.toString()) ?? [];
      const presentCount = presentDatesForStaff.length;
      const overlapCount = presentDatesForStaff.filter((d) => holidayDateSet.has(d)).length;
      const absentCount = Math.max(0, daysInMonth - presentCount - holidayCount + overlapCount);
      return {
        staffUserId: s.id.toString(),
        fullName: s.fullName,
        presentCount,
        absentCount,
        holidayCount,
      };
    });

    return ok({
      data,
      meta: {
        page: input.page,
        pageSize: input.pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / input.pageSize),
      },
    });
  }
}
