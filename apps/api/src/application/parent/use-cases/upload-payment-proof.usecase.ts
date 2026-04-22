import { v4 as uuidv4 } from 'uuid';
import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import { extensionForMime, validateImageBuffer } from '@shared/utils/image-validation';
import type { UserRole } from '@academyflo/contracts';

export interface UploadPaymentProofInput {
  actorUserId: string;
  actorRole: UserRole;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export interface UploadPaymentProofOutput {
  url: string;
}

/**
 * Handles parent payment-proof screenshot uploads. Storage folder is
 * `payment-proofs/{academyId}/{parentUserId}` so proofs are scoped per
 * parent and easy to track / purge on account deletion.
 */
export class UploadPaymentProofUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(input: UploadPaymentProofInput): Promise<Result<UploadPaymentProofOutput, AppError>> {
    if (input.actorRole !== 'PARENT') {
      return err(AppError.forbidden('Only parents can upload payment proof'));
    }

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) {
      return err(AppError.forbidden('No academy associated with this account'));
    }

    const bufferCheck = await validateImageBuffer(input.buffer, input.mimeType);
    if (!bufferCheck.valid) {
      return err(AppError.validation('Uploaded file is not a valid image'));
    }

    const ext = extensionForMime(input.mimeType);
    const filename = `${uuidv4()}.${ext}`;
    const folder = `payment-proofs/${user.academyId}/${input.actorUserId}`;

    const { url } = await this.fileStorage.upload(folder, filename, input.buffer, input.mimeType);
    return ok({ url });
  }
}
