import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import { AdminErrors } from '../../common/errors';

interface ForceLogoutAcademyInput {
  actorRole: string;
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

    const affectedUserIds = await this.userRepo.incrementTokenVersionByAcademyId(input.academyId);
    if (affectedUserIds.length > 0) {
      await this.sessionRepo.revokeAllByUserIds(affectedUserIds);
    }

    return ok({ affectedUsers: affectedUserIds.length });
  }
}
