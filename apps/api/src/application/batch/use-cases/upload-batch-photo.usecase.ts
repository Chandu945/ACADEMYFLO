import { v4 as uuidv4 } from 'uuid';
import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { Batch } from '@domain/batch/entities/batch.entity';
import type { BatchRepository } from '@domain/batch/ports/batch.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import { canManageBatch } from '@domain/batch/rules/batch.rules';
import { BatchErrors } from '../../common/errors';
import { requireBatchInAcademy } from '../common/require-batch';
import type { UserRole } from '@academyflo/contracts';
import { AppError as AppErrorClass } from '@shared/kernel';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
  extensionForMime,
  validateImageBuffer,
} from '@shared/utils/image-validation';

export interface UploadBatchPhotoInput {
  actorUserId: string;
  actorRole: UserRole;
  batchId: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export class UploadBatchPhotoUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly batchRepo: BatchRepository,
    private readonly fileStorage: FileStoragePort,
    /**
     * Used to record BATCH_PHOTO_UPLOADED audit (M1 fix). Optional so
     * legacy fixtures keep working. Production wiring always passes it.
     */
    private readonly auditRecorder?: AuditRecorderPort,
    /**
     * Used to log R2 cleanup failures (H2 fix). Optional.
     */
    private readonly logger?: LoggerPort,
  ) {}

  async execute(input: UploadBatchPhotoInput): Promise<Result<{ url: string }, AppError>> {
    const roleCheck = canManageBatch(input.actorRole);
    if (!roleCheck.allowed) {
      return err(BatchErrors.notAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(BatchErrors.academyRequired());
    }

    const batchResult = await requireBatchInAcademy(this.batchRepo, input.batchId, actor.academyId);
    if (!batchResult.ok) return err(batchResult.error);
    const batch = batchResult.value;

    if (
      !ALLOWED_IMAGE_MIME_TYPES.includes(
        input.mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
      )
    ) {
      return err(AppErrorClass.validation('Only JPEG, PNG, and WebP images are allowed'));
    }

    if (input.buffer.length > MAX_IMAGE_FILE_SIZE) {
      return err(AppErrorClass.validation('File size must not exceed 5MB'));
    }

    const bufferCheck = await validateImageBuffer(input.buffer, input.mimeType);
    if (!bufferCheck.valid) {
      return err(AppErrorClass.validation(bufferCheck.reason));
    }

    // H1 fix: upload the new photo FIRST, then save the record, then
    // best-effort delete the old photo. Prior order (delete old → upload
    // new) meant a failed upload left the batch with no photo at all.
    // Mirrors the staff/student/gallery patterns shipped earlier.
    const ext = extensionForMime(input.mimeType);
    const filename = `${uuidv4()}.${ext}`;
    const folder = `batches/${actor.academyId}`;
    const previousUrl = batch.profilePhotoUrl;

    // H2 fix: wrap upload in try/catch so an R2 outage surfaces as a typed
    // UPLOAD_FAILED error rather than a raw 500. DB record is not yet
    // touched; batch still has its old photo if this fails.
    let url: string;
    try {
      const result = await this.fileStorage.upload(folder, filename, input.buffer, input.mimeType);
      url = result.url;
    } catch (e) {
      const errLike = e as { code?: string; name?: string };
      const code = (errLike.code ?? errLike.name ?? '').toLowerCase();
      if (code.includes('timeout') || code.includes('econn') || code.includes('network')) {
        return err(new AppErrorClass('NETWORK', 'Could not reach storage service. Please retry.'));
      }
      return err(new AppErrorClass('UPLOAD_FAILED', 'Failed to upload photo. Please try again.'));
    }

    const updated = Batch.reconstitute(input.batchId, {
      academyId: batch.academyId,
      batchName: batch.batchName,
      batchNameNormalized: batch.batchNameNormalized,
      days: batch.days,
      notes: batch.notes,
      profilePhotoUrl: url,
      startTime: batch.startTime,
      endTime: batch.endTime,
      maxStudents: batch.maxStudents,
      status: batch.status,
      audit: updateAuditFields(batch.audit),
    });

    await this.batchRepo.save(updated);

    // Best-effort cleanup of the previous photo. The DB now points at the
    // new URL; orphan blob is harmless and storage GC eventually cleans it.
    if (previousUrl) {
      try {
        await this.fileStorage.delete(previousUrl);
      } catch (error) {
        this.logger?.warn('Batch photo R2 delete failed (orphan blob retained)', {
          batchId: input.batchId,
          previousUrl,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    // M1 fix: record BATCH_PHOTO_UPLOADED audit. Context includes batch
    // name + filename; URL deliberately omitted (matches student/staff
    // photo patterns).
    if (this.auditRecorder) {
      await this.auditRecorder.record({
        academyId: actor.academyId,
        actorUserId: input.actorUserId,
        action: 'BATCH_PHOTO_UPLOADED',
        entityType: 'BATCH',
        entityId: input.batchId,
        context: {
          batchName: batch.batchName,
          mimeType: input.mimeType,
          originalName: input.originalName,
        },
      });
    }

    return ok({ url });
  }
}
