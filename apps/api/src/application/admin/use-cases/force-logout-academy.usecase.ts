import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { DeviceTokenRepository } from '@domain/notification/ports/device-token.repository';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { AdminErrors } from '../../common/errors';

interface ForceLogoutAcademyInput {
  actorRole: string;
  actorUserId: string;
  academyId: string;
}

export interface ForceLogoutAcademyOutput {
  affectedUsers: number;
}

export class ForceLogoutAcademyUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly auditRecorder: AuditRecorderPort,
    private readonly deviceTokenRepo: DeviceTokenRepository,
  ) {}

  async execute(
    input: ForceLogoutAcademyInput,
  ): Promise<Result<ForceLogoutAcademyOutput, AppError>> {
    if (input.actorRole !== 'SUPER_ADMIN') {
      return err(AdminErrors.notSuperAdmin());
    }

    const academy = await this.academyRepo.findById(input.academyId);
    if (!academy) {
      return err(AdminErrors.academyNotFound(input.academyId));
    }

    // Note: user auth cache entries (user:auth:{userId}) for affected users will be
    // invalidated on next JWT check via tokenVersion mismatch, and expire within 5 min TTL.
    const affectedUserIds = await this.userRepo.incrementTokenVersionByAcademyId(input.academyId);
    if (affectedUserIds.length > 0) {
      await this.sessionRepo.revokeAllByUserIds(affectedUserIds);
      await this.deviceTokenRepo.removeByUserIds(affectedUserIds);
    }

    await this.auditRecorder.record({
      academyId: input.academyId,
      actorUserId: input.actorUserId,
      action: 'ADMIN_ACADEMY_FORCE_LOGOUT',
      entityType: 'ACADEMY',
      entityId: input.academyId,
      context: {
        affectedUsers: String(affectedUserIds.length),
      },
    });

    return ok({ affectedUsers: affectedUserIds.length });
  }
}
