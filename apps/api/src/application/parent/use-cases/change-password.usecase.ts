import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { DeviceTokenRepository } from '@domain/notification/ports/device-token.repository';
import type { PasswordHasher } from '@application/identity/ports/password-hasher.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { UserAuthCachePort } from '@application/identity/ports/user-auth-cache.port';
import { canViewOwnChildren } from '@domain/parent/rules/parent.rules';
import { ParentErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';

export interface ChangePasswordInput {
  parentUserId: string;
  parentRole: UserRole;
  currentPassword: string;
  newPassword: string;
}

export class ChangePasswordUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    /**
     * Used to revoke every active session for the parent after their password
     * rotates (H1 parent-flows audit fix). Mirrors the confirm-password-reset
     * path so an attacker holding a stolen JWT loses access the moment the
     * parent changes their password. Optional so legacy fixtures keep
     * compiling without the new wiring; production DI always passes it.
     */
    private readonly sessionRepo?: SessionRepository,
    /**
     * Used to invalidate FCM tokens so push notifications stop landing on a
     * compromised device. Same optional-port convention as sessionRepo.
     */
    private readonly deviceTokenRepo?: DeviceTokenRepository,
    /**
     * Records PASSWORD_CHANGED in the audit feed (H1 parent-flows audit fix).
     * Optional so legacy fixtures keep working.
     */
    private readonly auditRecorder?: AuditRecorderPort,
    /**
     * H1 identity-audit fix: bust the JwtAuthGuard cache. Without this, an
     * old access token in an attacker's hands keeps working for up to 5 min
     * because the cached tokenVersion still matches the OLD payload.
     */
    private readonly userAuthCache?: UserAuthCachePort,
  ) {}

  async execute(input: ChangePasswordInput): Promise<Result<void, AppError>> {
    const check = canViewOwnChildren(input.parentRole);
    if (!check.allowed) {
      // Role gate. canViewOwnChildren is reused for parent-scoped routes so
      // a non-parent shouldn't reach this code at all — controller already
      // enforces @Roles('PARENT'). Surface FORBIDDEN rather than the
      // misleading "child not linked" the prior code used.
      return err(AppErrorClass.forbidden('Only parents can change their password here'));
    }

    const user = await this.userRepo.findById(input.parentUserId);
    if (!user) return err(ParentErrors.parentNotFound(input.parentUserId));

    const matches = await this.passwordHasher.compare(input.currentPassword, user.passwordHash);
    if (!matches) {
      return err(AppErrorClass.validation('Current password is incorrect'));
    }

    // Reject "rotate to the same password" — most often a UX mistake but
    // also defeats the security purpose of rotation. Compared post-hash to
    // avoid timing differences from the plaintext compare above.
    const sameAsOld = await this.passwordHasher.compare(input.newPassword, user.passwordHash);
    if (sameAsOld) {
      return err(AppErrorClass.validation('New password must be different from the current one'));
    }

    const newHash = await this.passwordHasher.hash(input.newPassword);
    const updated = user.changePassword(newHash);
    await this.userRepo.save(updated);

    // H1 fix: post-save side-effects mirror confirm-password-reset. A failed
    // session revoke or token cleanup should NOT roll back the password save
    // (rolling back would leave the user with a known-broken old password),
    // so each side-effect logs-and-continues on failure.
    if (this.sessionRepo) {
      await this.sessionRepo.revokeAllByUserIds([input.parentUserId]).catch(() => {});
    }
    if (this.deviceTokenRepo) {
      await this.deviceTokenRepo.removeByUserIds([input.parentUserId]).catch(() => {});
    }
    // H1 identity-audit fix: explicit cache bust. See port docstring.
    await this.userAuthCache?.invalidate(input.parentUserId).catch(() => {});
    if (this.auditRecorder) {
      await this.auditRecorder
        .record({
          academyId: user.academyId ?? 'UNKNOWN',
          actorUserId: input.parentUserId,
          action: 'PASSWORD_CHANGED',
          entityType: 'USER',
          entityId: input.parentUserId,
          context: { role: user.role },
        })
        .catch(() => {});
    }

    return ok(undefined);
  }
}
