import { v4 as uuidv4 } from 'uuid';
import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
  extensionForMime,
  validateImageBuffer,
} from '@shared/utils/image-validation';
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
    /**
     * Used to log R2 upload failures (H2 fix). Optional so legacy fixtures
     * keep working — without it, R2 failures still surface as typed errors,
     * just without ops-side logging.
     */
    private readonly logger?: LoggerPort,
  ) {}

  async execute(
    input: UploadPaymentProofInput,
  ): Promise<Result<UploadPaymentProofOutput, AppError>> {
    if (input.actorRole !== 'PARENT') {
      return err(AppError.forbidden('Only parents can upload payment proof'));
    }

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) {
      return err(AppError.forbidden('No academy associated with this account'));
    }

    // H2 fix: apply the same upload-hardening pattern as student/staff/batch
    // photo uploads. Pre-fix code had only the buffer-magic-byte check,
    // missing the size cap and mime allow-list. A bad-signal retry of a
    // 30 MB photo would either succeed (filling storage) or get a raw 500
    // from R2 with no graceful error path.
    if (
      !ALLOWED_IMAGE_MIME_TYPES.includes(
        input.mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
      )
    ) {
      return err(AppError.validation('Only JPEG, PNG, and WebP images are allowed'));
    }

    if (input.buffer.length > MAX_IMAGE_FILE_SIZE) {
      return err(AppError.validation('File size must not exceed 5MB'));
    }

    const bufferCheck = await validateImageBuffer(input.buffer, input.mimeType);
    if (!bufferCheck.valid) {
      return err(AppError.validation('Uploaded file is not a valid image'));
    }

    const ext = extensionForMime(input.mimeType);
    const filename = `${uuidv4()}.${ext}`;
    const folder = `payment-proofs/${user.academyId}/${input.actorUserId}`;

    // H2 fix: wrap upload in try/catch so an R2 outage surfaces as a typed
    // UPLOAD_FAILED error rather than a raw 500. Timeout/network errors
    // distinguished from terminal failures so the client can decide whether
    // retrying is sensible (mirrors gallery/staff upload patterns).
    try {
      const result = await this.fileStorage.upload(folder, filename, input.buffer, input.mimeType);
      return ok({ url: result.url });
    } catch (e) {
      const errLike = e as { code?: string; name?: string; message?: string };
      const code = (errLike.code ?? errLike.name ?? '').toLowerCase();
      if (code.includes('timeout') || code.includes('econn') || code.includes('network')) {
        return err(new AppError('NETWORK', 'Could not reach storage service. Please retry.'));
      }
      this.logger?.error('Payment-proof storage upload failed', {
        code,
        message: errLike.message ?? '',
        parentUserId: input.actorUserId,
        academyId: user.academyId,
      });
      return err(
        new AppError('UPLOAD_FAILED', 'Failed to upload payment proof. Please try again.'),
      );
    }
  }
}
