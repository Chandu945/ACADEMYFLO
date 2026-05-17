import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import type { GalleryPhotoRepository } from '@domain/event/ports/gallery-photo.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import { GalleryErrors, EventErrors } from '../../common/errors';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { UserRole } from '@academyflo/contracts';

export interface DeleteGalleryPhotoInput {
  actorUserId: string;
  actorRole: UserRole;
  eventId: string;
  photoId: string;
}

export class DeleteGalleryPhotoUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly eventRepo: EventRepository,
    private readonly galleryPhotoRepo: GalleryPhotoRepository,
    private readonly fileStorage: FileStoragePort,
    private readonly auditRecorder: AuditRecorderPort,
    /**
     * Used to log R2 delete failures (H2 fix). Optional so legacy fixtures
     * keep working — without it, R2 failures are swallowed silently.
     */
    private readonly logger?: LoggerPort,
  ) {}

  async execute(input: DeleteGalleryPhotoInput): Promise<Result<{ deleted: true }, AppError>> {
    if (input.actorRole !== 'OWNER' && input.actorRole !== 'STAFF') {
      return err(GalleryErrors.notAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(EventErrors.academyRequired());
    }

    const event = await this.eventRepo.findById(input.eventId);
    if (!event) return err(GalleryErrors.eventNotFound());
    if (event.academyId !== actor.academyId) return err(EventErrors.notInAcademy());

    const photo = await this.galleryPhotoRepo.findById(input.photoId);
    if (!photo) return err(GalleryErrors.photoNotFound());
    if (photo.eventId !== input.eventId) return err(GalleryErrors.photoNotFound());

    // OWNER can delete any photo; STAFF can only delete their own
    if (input.actorRole === 'STAFF' && photo.uploadedBy !== input.actorUserId) {
      return err(GalleryErrors.notAllowed());
    }

    // H3 fix: delete the DB record FIRST, then best-effort delete the blob.
    // Prior order (blob → record) meant a record-delete failure left the
    // gallery row pointing at a 404 URL (broken thumbnail forever). The
    // reversed order trades that bug for orphan blobs, which are cheaper:
    // the row is gone, the UI won't render it, and storage GC eventually
    // cleans the file.
    await this.galleryPhotoRepo.delete(input.photoId);

    // H2 fix: wrap R2 delete in try/catch so a transient storage failure
    // doesn't abort the user-visible delete (the record is already gone).
    // Surface failures to structured logs so ops can sweep orphans.
    try {
      await this.fileStorage.delete(photo.url);
    } catch (error) {
      this.logger?.warn('Gallery photo R2 delete failed (orphan blob retained)', {
        eventId: input.eventId,
        photoId: input.photoId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }

    // M6 fix: include eventId in the audit context so the entry is
    // navigable — "who deleted what from which event's gallery".
    await this.auditRecorder.record({
      academyId: actor.academyId,
      actorUserId: input.actorUserId,
      action: 'GALLERY_PHOTO_DELETED',
      entityType: 'GALLERY_PHOTO',
      entityId: input.photoId,
      context: {
        eventId: input.eventId,
        uploadedBy: photo.uploadedBy,
      },
    });

    return ok({ deleted: true as const });
  }
}
