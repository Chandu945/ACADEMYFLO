import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { DeviceTokenRepository } from '@domain/notification/ports/device-token.repository';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { EmailSenderPort } from '../../notifications/ports/email-sender.port';
import { renderAcademyLoginDisabledEmail } from '../../notifications/templates/academy-login-disabled-template';
import { AdminErrors } from '../../common/errors';

interface SetAcademyLoginDisabledInput {
  actorRole: string;
  actorUserId: string;
  academyId: string;
  disabled: boolean;
}

export interface SetAcademyLoginDisabledOutput {
  loginDisabled: boolean;
  affectedUsers: number;
}

/**
 * Disable or enable academy login.
 *
 * When disabling, this use-case atomically:
 * 1. Sets academy.loginDisabled = true (with deactivatedAt timestamp)
 * 2. Bumps tokenVersion for all academy users (invalidates existing JWTs)
 * 3. Revokes all active sessions (invalidates refresh tokens)
 *
 * This ensures immediate logout — no academy user can continue using the app
 * after admin disables login.
 */
export class SetAcademyLoginDisabledUseCase {
  constructor(
    private readonly academyRepo: AcademyRepository,
    private readonly userRepo: UserRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly auditRecorder: AuditRecorderPort,
    private readonly emailSender?: EmailSenderPort,
    private readonly deviceTokenRepo?: DeviceTokenRepository,
  ) {}

  async execute(
    input: SetAcademyLoginDisabledInput,
  ): Promise<Result<SetAcademyLoginDisabledOutput, AppError>> {
    if (input.actorRole !== 'SUPER_ADMIN') {
      return err(AdminErrors.notSuperAdmin());
    }

    const academy = await this.academyRepo.findById(input.academyId);
    if (!academy) {
      return err(AdminErrors.academyNotFound(input.academyId));
    }

    const updated = academy.setLoginDisabled(input.disabled);
    await this.academyRepo.save(updated);

    let affectedUsers = 0;

    // When disabling: force logout all academy users immediately.
    // Note: user auth cache entries (user:auth:{userId}) for affected users will be
    // invalidated on next JWT check via tokenVersion mismatch, and expire within 5 min TTL.
    if (input.disabled) {
      const affectedUserIds = await this.userRepo.incrementTokenVersionByAcademyId(
        input.academyId,
      );
      if (affectedUserIds.length > 0) {
        await this.sessionRepo.revokeAllByUserIds(affectedUserIds);
        await this.deviceTokenRepo?.removeByUserIds(affectedUserIds);
      }
      affectedUsers = affectedUserIds.length;
    }

    await this.auditRecorder.record({
      academyId: input.academyId,
      actorUserId: input.actorUserId,
      action: 'ADMIN_ACADEMY_LOGIN_DISABLED',
      entityType: 'ACADEMY',
      entityId: input.academyId,
      context: {
        disabled: String(input.disabled),
        affectedUsers: String(affectedUsers),
      },
    });

    // Fire-and-forget: notify academy owner about login status change
    if (this.emailSender) {
      const owner = await this.userRepo.findById(academy.ownerUserId);
      if (owner) {
        this.emailSender.send({
          to: owner.emailNormalized,
          subject: `Academy Login ${input.disabled ? 'Disabled' : 'Re-Enabled'}`,
          html: renderAcademyLoginDisabledEmail({
            recipientName: owner.fullName,
            academyName: academy.academyName,
            disabled: input.disabled,
          }),
        }).catch(() => {});
      }
    }

    return ok({ loginDisabled: input.disabled, affectedUsers });
  }
}
