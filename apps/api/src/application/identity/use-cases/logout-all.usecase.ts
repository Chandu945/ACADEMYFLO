import type { Result } from '@shared/kernel';
import { ok } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { DeviceTokenRepository } from '@domain/notification/ports/device-token.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';

export interface LogoutAllInput {
  userId: string;
}

export class LogoutAllUseCase {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly deviceTokenRepo: DeviceTokenRepository,
    /** M3 identity-audit fix: same shape as LogoutUseCase. */
    private readonly userRepo?: UserRepository,
    private readonly auditRecorder?: AuditRecorderPort,
  ) {}

  async execute(input: LogoutAllInput): Promise<Result<void, AppError>> {
    await this.sessionRepo.revokeAllByUserIds([input.userId]);
    await this.deviceTokenRepo.removeByUserIds([input.userId]);

    if (this.auditRecorder && this.userRepo) {
      const user = await this.userRepo.findById(input.userId);
      if (user && user.academyId) {
        await this.auditRecorder
          .record({
            academyId: user.academyId,
            actorUserId: input.userId,
            action: 'USER_LOGGED_OUT',
            entityType: 'USER',
            entityId: input.userId,
            context: { role: user.role, scope: 'all-devices' },
          })
          .catch(() => {});
      }
    }

    return ok(undefined);
  }
}
