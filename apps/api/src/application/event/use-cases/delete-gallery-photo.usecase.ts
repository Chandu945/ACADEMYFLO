import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import type { GalleryPhotoRepository } from '@domain/event/ports/gallery-photo.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import { GalleryErrors, EventErrors } from '../../common/errors';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { UserRole } from '@playconnect/contracts';

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
  ) {}

  async execute(input: DeleteGalleryPhotoInput): Promise<Result<{ success: true }, AppError>> {
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

    // Delete from Cloudinary
    await this.fileStorage.delete(photo.url);

    // Delete record
    await this.galleryPhotoRepo.delete(input.photoId);

    await this.auditRecorder.record({
      academyId: actor.academyId,
      actorUserId: input.actorUserId,
      action: 'GALLERY_PHOTO_DELETED',
      entityType: 'GALLERY_PHOTO',
      entityId: input.photoId,
    });

    return ok({ success: true });
  }
}
