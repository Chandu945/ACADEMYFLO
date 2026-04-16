import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StaffAttendanceRepository } from '@domain/staff-attendance/ports/staff-attendance.repository';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import { canViewStaffAttendance } from '@domain/staff-attendance/rules/staff-attendance.rules';
import { validateLocalDate } from '@domain/attendance/rules/attendance.rules';
import { StaffAttendanceErrors } from '../../common/errors';
import type { DailyStaffAttendanceReportDto } from '../dtos/staff-attendance.dto';
import type { UserRole } from '@playconnect/contracts';

export interface GetDailyStaffAttendanceReportInput {
  actorUserId: string;
  actorRole: UserRole;
  date: string;
}

export class GetDailyStaffAttendanceReportUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly staffAttendanceRepo: StaffAttendanceRepository,
    private readonly holidayRepo: HolidayRepository,
  ) {}

  async execute(
    input: GetDailyStaffAttendanceReportInput,
  ): Promise<Result<DailyStaffAttendanceReportDto, AppError>> {
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

    // Staff attendance is required even on holidays, but the report should still
    // SURFACE whether the date was a declared holiday so downstream consumers
    // (PDF exports, admin tools) can render context — matches the daily view.
    // Use countActiveByAcademyAndRole — listByAcademyAndRole's `total` wrongly
    // includes INACTIVE staff (only filters by role + deletedAt, not status),
    // which would give a misleading "present = total - absent" denominator.
    const [holiday, totalActive, absentRecords] = await Promise.all([
      this.holidayRepo.findByAcademyAndDate(actor.academyId, input.date),
      this.userRepo.countActiveByAcademyAndRole(actor.academyId, 'STAFF'),
      this.staffAttendanceRepo.findAbsentByAcademyAndDate(actor.academyId, input.date),
    ]);
    const isHoliday = holiday !== null;

    // Batch-resolve absent staff names (avoids N+1 queries)
    const absentStaffIds = absentRecords.map((r) => r.staffUserId);
    const absentUsers = await this.userRepo.findByIds(absentStaffIds);
    const userMap = new Map(absentUsers.map((u) => [u.id.toString(), u]));
    const absentStaff = absentRecords
      .map((record) => {
        const user = userMap.get(record.staffUserId);
        return user ? { staffUserId: user.id.toString(), fullName: user.fullName } : null;
      })
      .filter((entry): entry is { staffUserId: string; fullName: string } => entry !== null);

    return ok({
      date: input.date,
      isHoliday,
      presentCount: totalActive - absentRecords.length,
      absentCount: absentRecords.length,
      absentStaff,
    });
  }
}
