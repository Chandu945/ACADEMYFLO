import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StaffAttendanceRepository } from '@domain/staff-attendance/ports/staff-attendance.repository';
import { canViewStaffAttendance } from '@domain/staff-attendance/rules/staff-attendance.rules';
import { validateLocalDate } from '@domain/attendance/rules/attendance.rules';
import { StaffAttendanceErrors } from '../../common/errors';
import type { DailyStaffAttendanceViewItem } from '../dtos/staff-attendance.dto';
import type { UserRole } from '@playconnect/contracts';

export interface GetDailyStaffAttendanceViewInput {
  actorUserId: string;
  actorRole: UserRole;
  date: string;
  page: number;
  pageSize: number;
}

export interface GetDailyStaffAttendanceViewOutput {
  date: string;
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

    // Fetch ACTIVE staff paginated
    const { users: staffUsers, total } = await this.userRepo.listByAcademyAndRole(
      actor.academyId,
      'STAFF',
      input.page,
      input.pageSize,
    );

    const activeStaff = staffUsers.filter((u) => u.isActive());
    const activeTotal = total; // listByAcademyAndRole returns active users by design from E2E patterns

    const staffIds = activeStaff.map((s) => s.id.toString());

    // Fetch absent records for these staff on this date
    const absentRecords = await this.staffAttendanceRepo.findAbsentByAcademyDateAndStaffIds(
      actor.academyId,
      input.date,
      staffIds,
    );
    const absentSet = new Set(absentRecords.map((r) => r.staffUserId));

    const data: DailyStaffAttendanceViewItem[] = activeStaff.map((s) => ({
      staffUserId: s.id.toString(),
      fullName: s.fullName,
      status: absentSet.has(s.id.toString()) ? ('ABSENT' as const) : ('PRESENT' as const),
    }));

    return ok({
      date: input.date,
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
