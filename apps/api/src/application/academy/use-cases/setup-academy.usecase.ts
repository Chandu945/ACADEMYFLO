import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { Academy } from '@domain/academy/entities/academy.entity';
import type { Address } from '@domain/academy/entities/academy.entity';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canSetupAcademy } from '@domain/academy/rules/academy.rules';
import type { UserRole } from '@playconnect/contracts';
import type { CreateTrialSubscriptionUseCase } from '../../subscription/use-cases/create-trial-subscription.usecase';
import { AuthErrors } from '../../common/errors';
import { randomUUID } from 'crypto';

export interface SetupAcademyInput {
  ownerUserId: string;
  ownerRole: UserRole;
  academyName: string;
  address: Address;
}

export interface SetupAcademyOutput {
  id: string;
  academyName: string;
  address: Address;
}

export class SetupAcademyUseCase {
  constructor(
    private readonly academyRepo: AcademyRepository,
    private readonly userRepo: UserRepository,
    private readonly createTrial: CreateTrialSubscriptionUseCase,
  ) {}

  async execute(input: SetupAcademyInput): Promise<Result<SetupAcademyOutput, AppError>> {
    const roleCheck = canSetupAcademy(input.ownerRole);
    if (!roleCheck.allowed) {
      return err(AuthErrors.notOwner());
    }

    const existing = await this.academyRepo.findByOwnerUserId(input.ownerUserId);
    if (existing) {
      return err(AuthErrors.academyAlreadyExists());
    }

    const academyId = randomUUID();
    const academy = Academy.create({
      id: academyId,
      ownerUserId: input.ownerUserId,
      academyName: input.academyName,
      address: input.address,
    });

    await this.academyRepo.save(academy);

    // Set academyId on the owner user
    await this.userRepo.updateAcademyId(input.ownerUserId, academyId);

    // Create trial subscription
    await this.createTrial.execute(academyId);

    return ok({
      id: academy.id.toString(),
      academyName: academy.academyName,
      address: academy.address,
    });
  }
}
