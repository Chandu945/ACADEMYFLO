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
  daysElapsedInMonth,
  getTodayLocalDate,
} from '@domain/attendance/value-objects/local-date.vo';
import { StaffAttendanceErrors } from '../../common/errors';
import { formatLocalDate } from '@shared/date-utils';
import type { MonthlyStaffAttendanceSummaryItem } from '../dtos/staff-attendance.dto';
import type { UserRole } from '@academyflo/contracts';

/** Inclusive day count between two YYYY-MM-DD keys. Returns 0 if a > b. */
function daysBetweenLocalKeys(a: string, b: string): number {
  if (a > b) return 0;
  const aDate = new Date(a + 'T00:00:00Z');
  const bDate = new Date(b + 'T00:00:00Z');
  return Math.floor((bDate.getTime() - aDate.getTime()) / 86_400_000) + 1;
}

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

    // Get ACTIVE staff paginated. H1 fix (attendance audit): push the status
    // filter into the repo so `total` reflects only ACTIVE staff — prior code
    // returned both ACTIVE + INACTIVE in the page and used the unfiltered
    // total, so a page of 20 might show 14 ACTIVE staff and a misleading
    // "N total" / "X pages" count.
    const { users: staffUsers, total } = await this.userRepo.listByAcademyAndRole(
      actor.academyId,
      'STAFF',
      input.page,
      input.pageSize,
      'ACTIVE',
    );

    // Get all present records and holidays for the month in bulk
    const [allPresent, holidays] = await Promise.all([
      this.staffAttendanceRepo.findPresentByAcademyAndMonth(actor.academyId, input.month),
      this.holidayRepo.findByAcademyAndMonth(actor.academyId, input.month),
    ]);

    // Cap "elapsed days" to today (IST) so future calendar days aren't counted
    // as absences. Cap holidayCount the same way so future holidays don't
    // shrink past absences.
    const today = getTodayLocalDate();
    const elapsedDays = daysElapsedInMonth(input.month);
    const monthStart = `${input.month}-01`;
    // Effective end of the window we're scoring against, expressed as a
    // YYYY-MM-DD key. We cap at the elapsed day so future days don't show
    // up as absences. Past months: elapsedDays = full month, so end = month
    // end. Current month: end = today.
    const elapsedEnd = `${input.month}-${String(elapsedDays).padStart(2, '0')}`;
    const elapsedHolidayDates = holidays.filter((h) => h.date <= today).map((h) => h.date);
    const elapsedHolidaySet = new Set(elapsedHolidayDates);

    // Build present dates per staff (to compute overlap with holidays)
    const presentDatesMap = new Map<string, string[]>();
    for (const record of allPresent) {
      const dates = presentDatesMap.get(record.staffUserId) ?? [];
      dates.push(record.date);
      presentDatesMap.set(record.staffUserId, dates);
    }

    const data: MonthlyStaffAttendanceSummaryItem[] = staffUsers.map((s) => {
      // BUG-037: clamp the scoring window to the staff member's startDate
      // when they joined mid-month. Without this clamp, a staff who joined
      // on the 15th gets scored from the 1st and looks "absent" for the
      // first half of the month. Mirrors the per-batch enrollment clamp
      // for students (BUG-032 / get-monthly-attendance-summary).
      const staffStartKey = s.startDate ? formatLocalDate(s.startDate) : monthStart;
      const effectiveStart = staffStartKey > monthStart ? staffStartKey : monthStart;
      const presentDatesForStaff = presentDatesMap.get(s.id.toString()) ?? [];

      if (effectiveStart > elapsedEnd) {
        // Staff hadn't joined yet within the elapsed window. Score as
        // zero across the board so the row stays in the list but doesn't
        // distort their absence percentage.
        return {
          staffUserId: s.id.toString(),
          fullName: s.fullName,
          presentCount: 0,
          absentCount: 0,
          holidayCount: 0,
        };
      }

      const windowCalendarDays = daysBetweenLocalKeys(effectiveStart, elapsedEnd);
      const windowHolidayCount = elapsedHolidayDates.filter(
        (d) => d >= effectiveStart && d <= elapsedEnd,
      ).length;
      const presentInWindow = presentDatesForStaff.filter(
        (d) => d >= effectiveStart && d <= elapsedEnd,
      );
      const presentCount = presentInWindow.length;
      const overlapCount = presentInWindow.filter((d) => elapsedHolidaySet.has(d)).length;
      const absentCount = Math.max(
        0,
        windowCalendarDays - presentCount - windowHolidayCount + overlapCount,
      );
      return {
        staffUserId: s.id.toString(),
        fullName: s.fullName,
        presentCount,
        absentCount,
        holidayCount: windowHolidayCount,
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
