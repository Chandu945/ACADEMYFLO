import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StaffAttendanceRepository } from '@domain/staff-attendance/ports/staff-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import { canViewStaffAttendance } from '@domain/staff-attendance/rules/staff-attendance.rules';
import { validateLocalDate } from '@domain/attendance/rules/attendance.rules';
import { formatLocalDate } from '@shared/date-utils';
import { StaffAttendanceErrors } from '../../common/errors';
import type { DailyStaffAttendanceViewItem } from '../dtos/staff-attendance.dto';
import type { UserRole } from '@academyflo/contracts';

export interface GetDailyStaffAttendanceViewInput {
  actorUserId: string;
  actorRole: UserRole;
  date: string;
  page: number;
  pageSize: number;
}

export interface GetDailyStaffAttendanceViewOutput {
  date: string;
  isHoliday: boolean;
  data: DailyStaffAttendanceViewItem[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export class GetDailyStaffAttendanceViewUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly staffAttendanceRepo: StaffAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
  ) {}

  async execute(
    input: GetDailyStaffAttendanceViewInput,
  ): Promise<Result<GetDailyStaffAttendanceViewOutput, AppError>> {
    const roleCheck = canViewStaffAttendance(input.actorRole);
    if (!roleCheck.allowed) {
      return err(StaffAttendanceErrors.viewNotAllowed());
    }

    const dateCheck = validateLocalDate(input.date);
    if (!dateCheck.valid) {
      return err(AppErrorClass.validation(dateCheck.reason!));
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(StaffAttendanceErrors.academyRequired());
    }

    const holiday = await this.holidayRepo.findByAcademyAndDate(actor.academyId, input.date);
    const isHoliday = holiday !== null;

    // H1 fix (attendance audit): push the ACTIVE status filter into the repo
    // so `total` reflects the filtered set and the page itself is correctly
    // sized. Prior code post-filtered in memory (uneven page sizes — page
    // of 20 might surface only 14 ACTIVE staff because 6 INACTIVE got
    // filtered out after pagination) and asked for a separate active count.
    // Mirrors the list-staff M4 fix.
    const { users: activeStaffRaw, total: activeTotal } = await this.userRepo.listByAcademyAndRole(
      actor.academyId,
      'STAFF',
      input.page,
      input.pageSize,
      'ACTIVE',
    );

    // BUG-037: drop staff whose startDate is after the selected date — they
    // hadn't joined yet, so the row should not be markable from the daily
    // view. Mirrors the write-side guard in mark-staff-attendance and the
    // per-batch joining filter for students (BUG-032 read-side).
    // Known limitation: this filter runs AFTER repo pagination, so a page
    // may surface fewer staff than `pageSize` when some of the paginated
    // batch hadn't joined by the selected date. `totalItems` still reflects
    // the unfiltered count. Pushing the cutoff into the repo query is the
    // proper long-term fix (parallel to the H1 fix that did the same for
    // ACTIVE status). For QA purposes the post-filter is acceptable;
    // production with many mid-month-joining staff should follow up.
    const activeStaff = activeStaffRaw.filter(
      (s) => !s.startDate || formatLocalDate(s.startDate) <= input.date,
    );

    const staffIds = activeStaff.map((s) => s.id.toString());

    // Fetch present records for these staff on this date
    const presentRecords = await this.staffAttendanceRepo.findPresentByAcademyDateAndStaffIds(
      actor.academyId,
      input.date,
      staffIds,
    );
    const presentSet = new Set(presentRecords.map((r) => r.staffUserId));

    const data: DailyStaffAttendanceViewItem[] = activeStaff.map((s) => ({
      staffUserId: s.id.toString(),
      fullName: s.fullName,
      status: presentSet.has(s.id.toString()) ? ('PRESENT' as const) : ('ABSENT' as const),
    }));

    return ok({
      date: input.date,
      isHoliday,
      data,
      meta: {
        page: input.page,
        pageSize: input.pageSize,
        totalItems: activeTotal,
        totalPages: Math.ceil(activeTotal / input.pageSize),
      },
    });
  }
}
