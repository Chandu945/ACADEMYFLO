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

    const holiday = await this.holidayRepo.findByAcademyAndDate(actor.academyId, input.date);
    const isHoliday = holiday !== null;

    if (isHoliday) {
      return ok({
        date: input.date,
        isHoliday: true,
        presentCount: 0,
        absentCount: 0,
        absentStaff: [],
      });
    }

    // Get total ACTIVE staff count
    const { total: totalActive } = await this.userRepo.listByAcademyAndRole(
      actor.academyId,
      'STAFF',
      1,
      1,
    );

    // Get all absent records for the day
    const absentRecords = await this.staffAttendanceRepo.findAbsentByAcademyAndDate(
      actor.academyId,
      input.date,
    );

    // Resolve absent staff names
    const absentStaff: { staffUserId: string; fullName: string }[] = [];
    for (const record of absentRecords) {
      const user = await this.userRepo.findById(record.staffUserId);
      if (user) {
        absentStaff.push({
          staffUserId: user.id.toString(),
          fullName: user.fullName,
        });
      }
    }

    return ok({
      date: input.date,
      isHoliday: false,
      presentCount: totalActive - absentRecords.length,
      absentCount: absentRecords.length,
      absentStaff,
    });
  }
}
