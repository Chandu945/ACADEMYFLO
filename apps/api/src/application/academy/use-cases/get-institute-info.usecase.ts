import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { BankDetails } from '@domain/academy/entities/academy.entity';
import { InstituteInfoErrors } from '../../common/errors';
import type { UserRole } from '@playconnect/contracts';

export interface GetInstituteInfoInput {
  actorUserId: string;
  actorRole: UserRole;
}

export interface InstituteInfoDto {
  signatureStampUrl: string | null;
  bankDetails: BankDetails | null;
  upiId: string | null;
  qrCodeImageUrl: string | null;
}

export class GetInstituteInfoUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
  ) {}

  async execute(input: GetInstituteInfoInput): Promise<Result<InstituteInfoDto, AppError>> {
    if (input.actorRole !== 'OWNER') {
      return err(InstituteInfoErrors.viewNotAllowed());
    }

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(InstituteInfoErrors.academyRequired());

    const academy = await this.academyRepo.findById(user.academyId);
    if (!academy) return err(InstituteInfoErrors.academyRequired());

    const info = academy.instituteInfo;
    return ok({
      signatureStampUrl: info.signatureStampUrl,
      bankDetails: info.bankDetails,
      upiId: info.upiId,
      qrCodeImageUrl: info.qrCodeImageUrl,
    });
  }
}
