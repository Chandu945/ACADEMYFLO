import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import { InstituteInfoErrors } from '../../common/errors';
import type { UserRole } from '@playconnect/contracts';
import type { ImageType } from './upload-institute-image.usecase';

export interface DeleteInstituteImageInput {
  actorUserId: string;
  actorRole: UserRole;
  imageType: ImageType;
}

export class DeleteInstituteImageUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(input: DeleteInstituteImageInput): Promise<Result<{ success: true }, AppError>> {
    if (input.actorRole !== 'OWNER') {
      return err(InstituteInfoErrors.updateNotAllowed());
    }

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(InstituteInfoErrors.academyRequired());

    const academy = await this.academyRepo.findById(user.academyId);
    if (!academy) return err(InstituteInfoErrors.academyRequired());

    const info = academy.instituteInfo;
    const oldUrl = input.imageType === 'signature' ? info.signatureStampUrl : info.qrCodeImageUrl;

    if (oldUrl) {
      await this.fileStorage.delete(oldUrl);
    }

    const updateParams = input.imageType === 'signature'
      ? { signatureStampUrl: null }
      : { qrCodeImageUrl: null };

    const updated = academy.updateInstituteInfo(updateParams);
    await this.academyRepo.save(updated);

    return ok({ success: true });
  }
}
