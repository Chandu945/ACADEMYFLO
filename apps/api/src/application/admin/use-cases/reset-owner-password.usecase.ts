import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { DeviceTokenRepository } from '@domain/notification/ports/device-token.repository';
import type { PasswordHasher } from '../../identity/ports/password-hasher.port';
import type { PasswordGeneratorPort } from '../../common/password-generator.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { EmailSenderPort } from '../../notifications/ports/email-sender.port';
import { renderAdminPasswordResetEmail } from '../../notifications/templates/admin-password-reset-template';
import { AdminErrors } from '../../common/errors';

interface ResetOwnerPasswordInput {
  actorRole: string;
  actorUserId: string;
  academyId: string;
}

export interface ResetOwnerPasswordOutput {
  temporaryPassword: string;
  ownerEmail: string;
}

export class ResetOwnerPasswordUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly passwordGenerator: PasswordGeneratorPort,
    private readonly auditRecorder: AuditRecorderPort,
    private readonly deviceTokenRepo: DeviceTokenRepository,
    private readonly emailSender?: EmailSenderPort,
  ) {}

  async execute(
    input: ResetOwnerPasswordInput,
  ): Promise<Result<ResetOwnerPasswordOutput, AppError>> {
    if (input.actorRole !== 'SUPER_ADMIN') {
      return err(AdminErrors.notSuperAdmin());
    }

    const academy = await this.academyRepo.findById(input.academyId);
    if (!academy) {
      return err(AdminErrors.academyNotFound(input.academyId));
    }

    const owner = await this.userRepo.findById(academy.ownerUserId);
    if (!owner) {
      return err(AdminErrors.ownerNotFound(academy.ownerUserId));
    }

    const tempPassword = this.passwordGenerator.generate();
    const newHash = await this.passwordHasher.hash(tempPassword);

    // Domain method bumps tokenVersion and updates audit fields.
    const updated = owner.changePassword(newHash);
    await this.userRepo.save(updated);
    // Note: user auth cache (user:auth:{userId}) will be invalidated on next
    // JWT check via tokenVersion mismatch, and expires naturally within 5 min TTL.

    // Revoke all sessions for the owner
    await this.sessionRepo.revokeAllByUserIds([owner.id.toString()]);
    // Drop push tokens — the reset is typically a recovery path after
    // credential compromise; keeping tokens would leak subsequent pushes.
    await this.deviceTokenRepo.removeByUserIds([owner.id.toString()]);

    await this.auditRecorder.record({
      academyId: input.academyId,
      actorUserId: input.actorUserId,
      action: 'ADMIN_OWNER_PASSWORD_RESET',
      entityType: 'USER',
      entityId: owner.id.toString(),
      context: {
        ownerEmail: owner.emailNormalized,
      },
    });

    // Fire-and-forget: email the owner their new temporary password
    this.emailSender
      ?.send({
        to: owner.emailNormalized,
        subject: 'Your Academyflo Password Has Been Reset',
        html: renderAdminPasswordResetEmail({
          ownerName: owner.fullName,
          academyName: academy.academyName,
          tempPassword,
        }),
      })
      .catch(() => {/* best-effort — temp password also returned in API response */});

    return ok({
      temporaryPassword: tempPassword,
      ownerEmail: owner.emailNormalized,
    });
  }
}
