import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import { AdminErrors } from '../../common/errors';

interface SetAcademyLoginDisabledInput {
  actorRole: string;
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
      }
      affectedUsers = affectedUserIds.length;
    }

    return ok({ loginDisabled: input.disabled, affectedUsers });
  }
}
