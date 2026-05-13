import { v4 as uuidv4 } from 'uuid';
import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import { AuthErrors, StaffErrors } from '../../common/errors';
import { AppError as AppErrorClass } from '@shared/kernel';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
  extensionForMime,
  validateImageBuffer,
} from '@shared/utils/image-validation';

export interface UploadStaffPhotoInput {
  actorUserId: string;
  staffUserId: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export class UploadStaffPhotoUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly fileStorage: FileStoragePort,
    private readonly auditRecorder: AuditRecorderPort,
    /**
     * Used to log R2 failures during best-effort cleanup of the previous
     * photo (H2 fix). Optional so legacy fixtures keep working — without
     * it, R2 failures during old-photo cleanup are swallowed silently.
     */
    private readonly logger?: LoggerPort,
  ) {}

  async execute(input: UploadStaffPhotoInput): Promise<Result<{ url: string }, AppError>> {
    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(StaffErrors.academyRequired());
    }

    if (actor.role !== 'OWNER') {
      return err(AuthErrors.notOwner());
    }

    const staff = await this.userRepo.findById(input.staffUserId);
    if (!staff || staff.role !== 'STAFF') {
      return err(StaffErrors.notFound(input.staffUserId));
    }

    if (staff.academyId !== actor.academyId) {
      return err(StaffErrors.notInAcademy());
    }

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
    // new) meant a failed upload left the staff with no photo at all,
    // permanently. Mirrors the upload-student-photo pattern.
    const ext = extensionForMime(input.mimeType);
    const filename = `${uuidv4()}.${ext}`;
    const folder = `staff/${actor.academyId}`;
    const previousUrl = staff.profilePhotoUrl;

    // H2 fix: wrap the upload in try/catch so an R2 outage surfaces as a
    // typed UPLOAD_FAILED error rather than a raw 500. The DB record is
    // not yet touched, so the staff still has their old photo if this
    // fails.
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

    // Use the entity's own method instead of poking at private `props`.
    const updated = staff.updateProfilePhoto(url);

    await this.userRepo.save(updated);

    // Best-effort cleanup of the previous photo. If this fails the DB now
    // points at the new URL; the orphan blob is harmless and storage GC
    // eventually cleans it.
    if (previousUrl) {
      try {
        await this.fileStorage.delete(previousUrl);
      } catch (error) {
        this.logger?.warn('Staff photo R2 delete failed (orphan blob retained)', {
          staffUserId: input.staffUserId,
          previousUrl,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    // M5 fix: include staff name and original filename in the audit
    // context. URL deliberately omitted (PII path for the staff member).
    await this.auditRecorder.record({
      academyId: actor.academyId,
      actorUserId: input.actorUserId,
      action: 'STAFF_PHOTO_UPLOADED',
      entityType: 'USER',
      entityId: input.staffUserId,
      context: {
        staffName: staff.fullName,
        mimeType: input.mimeType,
        originalName: input.originalName,
      },
    });

    return ok({ url });
  }
}
