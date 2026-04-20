import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { PasswordHasher } from '@application/identity/ports/password-hasher.port';
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
  ) {}

  async execute(input: ChangePasswordInput): Promise<Result<void, AppError>> {
    const check = canViewOwnChildren(input.parentRole);
    if (!check.allowed) return err(ParentErrors.childNotLinked());

    const user = await this.userRepo.findById(input.parentUserId);
    if (!user) return err(ParentErrors.parentNotFound(input.parentUserId));

    const matches = await this.passwordHasher.compare(input.currentPassword, user.passwordHash);
    if (!matches) {
      return err(AppErrorClass.validation('Current password is incorrect'));
    }

    const newHash = await this.passwordHasher.hash(input.newPassword);
    const updated = user.changePassword(newHash);
    await this.userRepo.save(updated);

    return ok(undefined);
  }
}
