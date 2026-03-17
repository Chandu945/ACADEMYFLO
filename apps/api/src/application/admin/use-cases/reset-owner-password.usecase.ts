import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { User } from '@domain/identity/entities/user.entity';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { PasswordHasher } from '../../identity/ports/password-hasher.port';
import type { PasswordGeneratorPort } from '../../common/password-generator.port';
import { AdminErrors } from '../../common/errors';

interface ResetOwnerPasswordInput {
  actorRole: string;
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

    const updated = User.reconstitute(owner.id.toString(), {
      ...owner['props'],
      passwordHash: newHash,
      tokenVersion: owner.tokenVersion + 1,
    });
    await this.userRepo.save(updated);
    // Note: user auth cache (user:auth:{userId}) will be invalidated on next
    // JWT check via tokenVersion mismatch, and expires naturally within 5 min TTL.

    // Revoke all sessions for the owner
    await this.sessionRepo.revokeAllByUserIds([owner.id.toString()]);

    return ok({
      temporaryPassword: tempPassword,
      ownerEmail: owner.emailNormalized,
    });
  }
}
