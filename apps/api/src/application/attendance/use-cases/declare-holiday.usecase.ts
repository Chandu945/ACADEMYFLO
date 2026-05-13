import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import { Holiday } from '@domain/attendance/entities/holiday.entity';
import type { HolidayRepository } from '@domain/attendance/ports/holiday.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import {
  canDeclareHoliday,
  validateLocalDate,
  validateHolidayReason,
  validateHolidayDateRange,
} from '@domain/attendance/rules/attendance.rules';
import { AttendanceErrors } from '../../common/errors';
import type { HolidayDto } from '../dtos/attendance.dto';
import type { UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { PushNotificationService } from '../../notifications/push-notification.service';
import { buildHolidayDeclaredPush } from '../../notifications/templates/holiday-declared-push-template';
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
    private readonly academyRepo: AcademyRepository,
    private readonly auditRecorder: AuditRecorderPort,
    /**
     * Used to notify parents that the academy will be closed on the declared
     * date (M3 fix). Optional so legacy fixtures keep working — without it
     * the holiday is still created and audit-logged, only the push is
     * skipped.
     */
    private readonly pushService?: PushNotificationService,
  ) {}

  async execute(input: DeclareHolidayInput): Promise<Result<HolidayDto, AppError>> {
    const roleCheck = canDeclareHoliday(input.actorRole);
    if (!roleCheck.allowed) {
      return err(AttendanceErrors.holidayDeclareNotAllowed());
    }

    const dateCheck = validateLocalDate(input.date);
    if (!dateCheck.valid) {
      return err(AppErrorClass.validation(dateCheck.reason!));
    }

    // M2 + L6 fix: holiday declarations only require a date-format check
    // today, which accepts obvious typos like 2046-01-26 (year fat-finger)
    // or 1900-01-01 (default picker value). Bound it to a reasonable
    // planning window — 30 days back for forgot-to-declare workflows,
    // 2 years ahead for annual calendar planning.
    const dateRangeCheck = validateHolidayDateRange(input.date);
    if (!dateRangeCheck.valid) {
      return err(AppErrorClass.validation(dateRangeCheck.reason!));
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

    // Idempotent: if holiday already exists, return it (and skip the push —
    // owner re-tapping declare must not re-spam parents).
    const existing = await this.holidayRepo.findByAcademyAndDate(actor.academyId, input.date);
    if (existing) {
      return ok({
        id: existing.id.toString(),
        academyId: existing.academyId,
        date: existing.date,
        reason: existing.reason,
        declaredByUserId: existing.declaredByUserId,
        createdAt: existing.audit.createdAt.toISOString(),
      });
    }

    const holiday = Holiday.create({
      id: randomUUID(),
      academyId: actor.academyId,
      date: input.date,
      reason: input.reason,
      declaredByUserId: input.actorUserId,
    });

    try {
      await this.holidayRepo.save(holiday);
    } catch (e) {
      // M4 fix: concurrent declare for the same (academy, date) — both calls
      // passed the existence check and both attempted insert. The second
      // hits the unique index and Mongo throws 11000. Re-fetch the racing
      // winner's holiday and return it idempotently, matching the
      // pre-existing existence-check branch above. We deliberately return
      // BEFORE the audit + push below so the loser doesn't double-record or
      // double-notify — the winner's call already did both.
      if ((e as { code?: number })?.code === 11000) {
        const justCreated = await this.holidayRepo.findByAcademyAndDate(
          actor.academyId,
          input.date,
        );
        if (justCreated) {
          return ok({
            id: justCreated.id.toString(),
            academyId: justCreated.academyId,
            date: justCreated.date,
            reason: justCreated.reason,
            declaredByUserId: justCreated.declaredByUserId,
            createdAt: justCreated.audit.createdAt.toISOString(),
          });
        }
        // Defensive: dup-key fired but no record exists. Shouldn't happen
        // outside replication quirks; re-throw so it doesn't get silenced.
        throw e;
      }
      throw e;
    }

    // Note: We intentionally preserve attendance records — they will be hidden
    // while the holiday is active and restored if the holiday is removed.

    await this.auditRecorder.record({
      academyId: actor.academyId,
      actorUserId: input.actorUserId,
      action: 'HOLIDAY_DECLARED',
      entityType: 'HOLIDAY',
      entityId: holiday.id.toString(),
      context: {
        date: holiday.date,
        reason: holiday.reason ?? '',
      },
    });

    // M3 fix: notify all parents in the academy that classes are off on the
    // declared date. Without this, parents show up to a closed academy. The
    // existing email template (renderHolidayDeclaredEmail) was never wired
    // up — we use a fresh push template here to match the existing parent-
    // notification pattern (absences, payment results, etc. are all push).
    // Best-effort: a push failure must not roll back the holiday creation.
    if (this.pushService) {
      try {
        const academy = await this.academyRepo.findById(actor.academyId);
        if (academy) {
          // M1 holidays audit fix: use the dedicated ID-only fan-out method
          // instead of paginating listByAcademyAndRole with a hardcoded
          // pageSize=1000 cap. The pre-fix cap silently dropped any parent
          // beyond the 1000th — they'd show up to a closed academy because
          // no push reached them. listParentIdsByAcademy returns all active
          // parent IDs in one query (projection on _id only) so push fan-out
          // is complete regardless of academy size.
          const parentIds = await this.userRepo.listParentIdsByAcademy(actor.academyId);
          if (parentIds.length > 0) {
            const message = buildHolidayDeclaredPush({
              academyName: academy.academyName,
              academyId: actor.academyId,
              date: holiday.date,
              reason: holiday.reason,
            });
            await this.pushService.sendToUsers(parentIds, message);
          }
        }
      } catch {
        // Swallow — holiday saved + audit recorded. Missing a notification
        // is recoverable (parents can refresh the holidays list in-app).
      }
    }

    return ok({
      id: holiday.id.toString(),
      academyId: holiday.academyId,
      date: holiday.date,
      reason: holiday.reason,
      declaredByUserId: holiday.declaredByUserId,
      createdAt: holiday.audit.createdAt.toISOString(),
    });
  }
}
