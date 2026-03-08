import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import { canViewSettings } from '@domain/academy/rules/academy.rules';
import { FeeErrors } from '../../common/errors';
import type { UserRole } from '@playconnect/contracts';
import { DEFAULT_DUE_DATE_DAY, DEFAULT_RECEIPT_PREFIX } from '@playconnect/contracts';

export interface GetAcademySettingsInput {
  actorUserId: string;
  actorRole: UserRole;
}

export interface AcademySettingsDto {
  defaultDueDateDay: number;
  receiptPrefix: string;
}

export class GetAcademySettingsUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
  ) {}

  async execute(input: GetAcademySettingsInput): Promise<Result<AcademySettingsDto, AppError>> {
    const check = canViewSettings(input.actorRole);
    if (!check.allowed) return err(FeeErrors.settingsViewNotAllowed());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(FeeErrors.academyRequired());

    const academy = await this.academyRepo.findById(user.academyId);
    if (!academy) return err(FeeErrors.academyRequired());

    return ok({
      defaultDueDateDay: academy.defaultDueDateDay ?? DEFAULT_DUE_DATE_DAY,
      receiptPrefix: academy.receiptPrefix ?? DEFAULT_RECEIPT_PREFIX,
    });
  }
}
