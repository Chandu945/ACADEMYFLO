import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import { Holiday } from '@domain/attendance/entities/holiday.entity';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { StudentAttendanceRepository } from '@domain/attendance/ports/student-attendance.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import {
  canDeclareHoliday,
  validateLocalDate,
  validateHolidayReason,
} from '@domain/attendance/rules/attendance.rules';
import { AttendanceErrors } from '../../common/errors';
import type { HolidayDto } from '../dtos/attendance.dto';
import type { UserRole } from '@playconnect/contracts';
import { randomUUID } from 'crypto';

export interface DeclareHolidayInput {
  actorUserId: string;
  actorRole: UserRole;
  date: string;
  reason?: string;
}

export class DeclareHolidayUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly holidayRepo: HolidayRepository,
    // Kept for DI compatibility — absences are intentionally preserved when declaring a holiday
    private readonly _attendanceRepo: StudentAttendanceRepository,
  ) {
    void this._attendanceRepo;
  }

  async execute(input: DeclareHolidayInput): Promise<Result<HolidayDto, AppError>> {
    const roleCheck = canDeclareHoliday(input.actorRole);
    if (!roleCheck.allowed) {
      return err(AttendanceErrors.holidayDeclareNotAllowed());
    }

    const dateCheck = validateLocalDate(input.date);
    if (!dateCheck.valid) {
      return err(AppErrorClass.validation(dateCheck.reason!));
    }

    if (input.reason) {
      const reasonCheck = validateHolidayReason(input.reason);
      if (!reasonCheck.valid) {
        return err(AppErrorClass.validation(reasonCheck.reason!));
      }
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(AttendanceErrors.academyRequired());
    }

    // Idempotent: if holiday already exists, return it
    const existing = await this.holidayRepo.findByAcademyAndDate(actor.academyId, input.date);
    if (existing) {
      return ok({
        id: existing.id.toString(),
        academyId: existing.academyId,
        date: existing.date,
        reason: existing.reason,
        declaredByUserId: existing.declaredByUserId,
        createdAt: existing.audit.createdAt,
      });
    }

    const holiday = Holiday.create({
      id: randomUUID(),
      academyId: actor.academyId,
      date: input.date,
      reason: input.reason,
      declaredByUserId: input.actorUserId,
    });

    await this.holidayRepo.save(holiday);

    // Note: We intentionally preserve absent records — they will be hidden
    // while the holiday is active and restored if the holiday is removed.

    return ok({
      id: holiday.id.toString(),
      academyId: holiday.academyId,
      date: holiday.date,
      reason: holiday.reason,
      declaredByUserId: holiday.declaredByUserId,
      createdAt: holiday.audit.createdAt,
    });
  }
}
