import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StaffAttendanceRepository } from '@domain/staff-attendance/ports/staff-attendance.repository';
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

    // Get all absent records for the month in bulk
    const allAbsent = await this.staffAttendanceRepo.findAbsentByAcademyAndMonth(
      actor.academyId,
      input.month,
    );

    const daysInMonth = getDaysInMonth(input.month);

    // Build absent count per staff
    const absentCountMap = new Map<string, number>();
    for (const record of allAbsent) {
      absentCountMap.set(record.staffUserId, (absentCountMap.get(record.staffUserId) ?? 0) + 1);
    }

    const data: MonthlyStaffAttendanceSummaryItem[] = staffUsers.map((s) => {
      const absentCount = absentCountMap.get(s.id.toString()) ?? 0;
      const presentCount = Math.max(0, daysInMonth - absentCount);
      return {
        staffUserId: s.id.toString(),
        fullName: s.fullName,
        presentCount,
        absentCount,
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
