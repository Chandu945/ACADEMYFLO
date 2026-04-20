import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canViewOwnChildren } from '@domain/parent/rules/parent.rules';
import { ParentErrors } from '../../common/errors';
import type { ParentProfileDto } from '../dtos/parent.dto';
import type { UserRole } from '@academyflo/contracts';

export interface UpdateParentProfileInput {
  parentUserId: string;
  parentRole: UserRole;
  fullName?: string;
  phoneNumber?: string;
}

export class UpdateParentProfileUseCase {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(input: UpdateParentProfileInput): Promise<Result<ParentProfileDto, AppError>> {
    const check = canViewOwnChildren(input.parentRole);
    if (!check.allowed) return err(ParentErrors.childNotLinked());

    const user = await this.userRepo.findById(input.parentUserId);
    if (!user) return err(ParentErrors.parentNotFound(input.parentUserId));

    const updated = user.updateProfile(input.fullName, input.phoneNumber);
    await this.userRepo.save(updated);

    return ok({
      fullName: updated.fullName,
      email: updated.emailNormalized,
      phoneNumber: updated.phoneE164,
    });
  }
}
