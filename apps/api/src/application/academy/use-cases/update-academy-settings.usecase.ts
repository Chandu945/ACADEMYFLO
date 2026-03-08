import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import {
  canUpdateSettings,
  validateDefaultDueDateDay,
  validateReceiptPrefix,
} from '@domain/academy/rules/academy.rules';
import { FeeErrors } from '../../common/errors';
import type { UserRole } from '@playconnect/contracts';
import { DEFAULT_DUE_DATE_DAY, DEFAULT_RECEIPT_PREFIX } from '@playconnect/contracts';

export interface UpdateAcademySettingsInput {
  actorUserId: string;
  actorRole: UserRole;
  defaultDueDateDay?: number;
  receiptPrefix?: string;
}

export interface AcademySettingsDto {
  defaultDueDateDay: number;
  receiptPrefix: string;
}

export class UpdateAcademySettingsUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
  ) {}

  async execute(input: UpdateAcademySettingsInput): Promise<Result<AcademySettingsDto, AppError>> {
    const check = canUpdateSettings(input.actorRole);
    if (!check.allowed) return err(FeeErrors.settingsNotAllowed());

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(FeeErrors.academyRequired());

    const academy = await this.academyRepo.findById(user.academyId);
    if (!academy) return err(FeeErrors.academyRequired());

    if (input.defaultDueDateDay !== undefined) {
      const dayCheck = validateDefaultDueDateDay(input.defaultDueDateDay);
      if (!dayCheck.valid) return err(AppErrorClass.validation(dayCheck.reason!));
    }

    if (input.receiptPrefix !== undefined) {
      const prefixCheck = validateReceiptPrefix(input.receiptPrefix);
      if (!prefixCheck.valid) return err(AppErrorClass.validation(prefixCheck.reason!));
    }

    const updated = academy.updateSettings({
      defaultDueDateDay: input.defaultDueDateDay,
      receiptPrefix: input.receiptPrefix,
    });

    await this.academyRepo.save(updated);

    return ok({
      defaultDueDateDay: updated.defaultDueDateDay ?? DEFAULT_DUE_DATE_DAY,
      receiptPrefix: updated.receiptPrefix ?? DEFAULT_RECEIPT_PREFIX,
    });
  }
}
