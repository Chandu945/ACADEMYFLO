import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import type { GalleryPhotoRepository } from '@domain/event/ports/gallery-photo.repository';
import { GalleryErrors } from '../../common/errors';
import { EventErrors } from '../../common/errors';
import type { UserRole } from '@playconnect/contracts';

export interface ListGalleryPhotosInput {
  actorUserId: string;
  actorRole: UserRole;
  eventId: string;
}

export interface GalleryPhotoOutput {
  id: string;
  eventId: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: string;
}

export class ListGalleryPhotosUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly eventRepo: EventRepository,
    private readonly galleryPhotoRepo: GalleryPhotoRepository,
  ) {}

  async execute(input: ListGalleryPhotosInput): Promise<Result<GalleryPhotoOutput[], AppError>> {
    if (input.actorRole !== 'OWNER' && input.actorRole !== 'STAFF' && input.actorRole !== 'PARENT') {
      return err(GalleryErrors.notAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(EventErrors.academyRequired());
    }

    const event = await this.eventRepo.findById(input.eventId);
    if (!event) return err(GalleryErrors.eventNotFound());
    if (event.academyId !== actor.academyId) return err(EventErrors.notInAcademy());

    const photos = await this.galleryPhotoRepo.listByEventId(input.eventId);

    return ok(
      photos.map((photo) => ({
        id: photo.id.toString(),
        eventId: photo.eventId,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        caption: photo.caption,
        uploadedBy: photo.uploadedBy,
        uploadedByName: photo.uploadedByName,
        createdAt: photo.audit.createdAt.toISOString(),
      })),
    );
  }
}
