import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { BankDetails } from '@domain/academy/entities/academy.entity';
import { validateBankDetails, validateUpiId } from '@domain/academy/rules/institute-info.rules';
import { InstituteInfoErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';

export interface UpdateInstituteInfoInput {
  actorUserId: string;
  actorRole: UserRole;
  bankDetails?: BankDetails | null;
  upiId?: string | null;
}

export interface InstituteInfoDto {
  signatureStampUrl: string | null;
  bankDetails: BankDetails | null;
  upiId: string | null;
  qrCodeImageUrl: string | null;
}

export class UpdateInstituteInfoUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
  ) {}

  async execute(input: UpdateInstituteInfoInput): Promise<Result<InstituteInfoDto, AppError>> {
    if (input.actorRole !== 'OWNER') {
      return err(InstituteInfoErrors.updateNotAllowed());
    }

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(InstituteInfoErrors.academyRequired());

    const academy = await this.academyRepo.findById(user.academyId);
    if (!academy) return err(InstituteInfoErrors.academyRequired());

    if (input.bankDetails !== undefined && input.bankDetails !== null) {
      const bankCheck = validateBankDetails(input.bankDetails);
      if (!bankCheck.valid) return err(AppErrorClass.validation(bankCheck.reason!));
    }

    if (input.upiId !== undefined && input.upiId !== null) {
      const upiCheck = validateUpiId(input.upiId);
      if (!upiCheck.valid) return err(AppErrorClass.validation(upiCheck.reason!));
    }

    const updated = academy.updateInstituteInfo({
      bankDetails: input.bankDetails,
      upiId: input.upiId,
    });

    await this.academyRepo.save(updated);

    const info = updated.instituteInfo;
    return ok({
      signatureStampUrl: info.signatureStampUrl,
      bankDetails: info.bankDetails,
      upiId: info.upiId,
      qrCodeImageUrl: info.qrCodeImageUrl,
    });
  }
}
