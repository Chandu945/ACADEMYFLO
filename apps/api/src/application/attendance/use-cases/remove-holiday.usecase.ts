import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canDeclareHoliday, validateLocalDate } from '@domain/attendance/rules/attendance.rules';
import { AttendanceErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';

export interface RemoveHolidayInput {
  actorUserId: string;
  actorRole: UserRole;
  date: string;
}

export class RemoveHolidayUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly holidayRepo: HolidayRepository,
    private readonly auditRecorder: AuditRecorderPort,
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

    // Only emit audit if a holiday was actually deleted — remove is idempotent,
    // and auditing a no-op pollutes the feed.
    const existing = await this.holidayRepo.findByAcademyAndDate(actor.academyId, input.date);
    await this.holidayRepo.deleteByAcademyAndDate(actor.academyId, input.date);

    if (existing) {
      await this.auditRecorder.record({
        academyId: actor.academyId,
        actorUserId: input.actorUserId,
        action: 'HOLIDAY_REMOVED',
        entityType: 'HOLIDAY',
        entityId: existing.id.toString(),
        context: {
          date: existing.date,
          reason: existing.reason ?? '',
        },
      });
    }

    return ok({ date: input.date });
  }
}
