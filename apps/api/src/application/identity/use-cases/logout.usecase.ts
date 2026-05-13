import type { Result } from '@shared/kernel';
import { ok } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { DeviceTokenRepository } from '@domain/notification/ports/device-token.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';

export interface LogoutInput {
  userId: string;
  deviceId: string;
}

export class LogoutUseCase {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly deviceTokenRepo: DeviceTokenRepository,
    /** M3 identity-audit fix: load user so the audit row gets the right
     *  academyId. Optional for fixtures that don't care about audit. */
    private readonly userRepo?: UserRepository,
    private readonly auditRecorder?: AuditRecorderPort,
  ) {}

  async execute(input: LogoutInput): Promise<Result<void, AppError>> {
    await this.sessionRepo.revokeByUserAndDevice(input.userId, input.deviceId);
    // DeviceToken rows have no deviceId column, so per-device scoping is not
    // possible without a schema migration — remove all FCM tokens for this
    // user on any logout so push stops flowing to the device that logged out.
    await this.deviceTokenRepo.removeByUserIds([input.userId]);

    // M3 identity-audit fix: record the logout. Best-effort + post-revoke
    // (the user's session is gone regardless of whether the audit lands).
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
            context: { role: user.role, scope: 'device', deviceId: input.deviceId },
          })
          .catch(() => {});
      }
    }

    return ok(undefined);
  }
}
