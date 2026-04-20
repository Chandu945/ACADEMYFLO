import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canViewAttendance } from '@domain/attendance/rules/attendance.rules';
import { isValidMonthKey } from '@domain/attendance/value-objects/local-date.vo';
import { AttendanceErrors } from '../../common/errors';
import type { HolidayDto } from '../dtos/attendance.dto';
import type { UserRole } from '@academyflo/contracts';

export interface ListHolidaysInput {
  actorUserId: string;
  actorRole: UserRole;
  month: string;
}

export class ListHolidaysUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly holidayRepo: HolidayRepository,
  ) {}

  async execute(input: ListHolidaysInput): Promise<Result<HolidayDto[], AppError>> {
    const roleCheck = canViewAttendance(input.actorRole);
    if (!roleCheck.allowed) {
      return err(AttendanceErrors.viewNotAllowed());
    }

    if (!isValidMonthKey(input.month)) {
      return err(AppErrorClass.validation('Month must be a valid YYYY-MM format'));
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(AttendanceErrors.academyRequired());
    }

    const holidays = await this.holidayRepo.findByAcademyAndMonth(actor.academyId, input.month);

    return ok(
      holidays.map((h) => ({
        id: h.id.toString(),
        academyId: h.academyId,
        date: h.date,
        reason: h.reason,
        declaredByUserId: h.declaredByUserId,
        createdAt: h.audit.createdAt,
      })),
    );
  }
}
