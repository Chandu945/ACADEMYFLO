import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canDeclareHoliday, validateLocalDate } from '@domain/attendance/rules/attendance.rules';
import { AttendanceErrors } from '../../common/errors';
import type { UserRole } from '@playconnect/contracts';

export interface RemoveHolidayInput {
  actorUserId: string;
  actorRole: UserRole;
  date: string;
}

export class RemoveHolidayUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly holidayRepo: HolidayRepository,
  ) {}

  async execute(input: RemoveHolidayInput): Promise<Result<{ date: string }, AppError>> {
    const roleCheck = canDeclareHoliday(input.actorRole);
    if (!roleCheck.allowed) {
      return err(AttendanceErrors.holidayRemoveNotAllowed());
    }

    const dateCheck = validateLocalDate(input.date);
    if (!dateCheck.valid) {
      return err(AppErrorClass.validation(dateCheck.reason!));
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(AttendanceErrors.academyRequired());
    }

    // Idempotent: if no holiday, still return success
    await this.holidayRepo.deleteByAcademyAndDate(actor.academyId, input.date);

    return ok({ date: input.date });
  }
}
