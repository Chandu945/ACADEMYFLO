import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import type { GalleryPhotoRepository } from '@domain/event/ports/gallery-photo.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import { EventErrors } from '../../common/errors';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { UserRole } from '@playconnect/contracts';

export interface DeleteEventInput {
  actorUserId: string;
  actorRole: UserRole;
  eventId: string;
}

export class DeleteEventUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly eventRepo: EventRepository,
    private readonly galleryPhotoRepo: GalleryPhotoRepository,
    private readonly fileStorage: FileStoragePort,
    private readonly auditRecorder: AuditRecorderPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: DeleteEventInput): Promise<Result<{ deleted: true }, AppError>> {
    if (input.actorRole !== 'OWNER') {
      return err(EventErrors.deleteNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) return err(EventErrors.academyRequired());

    const event = await this.eventRepo.findById(input.eventId);
    if (!event) return err(EventErrors.notFound(input.eventId));
    if (event.academyId !== actor.academyId) return err(EventErrors.notInAcademy());

    // Cascade: delete gallery photos (R2 blobs + DB rows) before the event.
    // R2 deletes are best-effort — a transient storage failure should not
    // block the user's delete. Orphaned blobs are a known acceptable failure
    // mode; the DB rows are gone and R2 404s on retry are no-ops.
    const photos = await this.galleryPhotoRepo.listByEventId(input.eventId);
    let storageDeleteFailures = 0;
    for (const photo of photos) {
      try {
        await this.fileStorage.delete(photo.url);
      } catch (error) {
        storageDeleteFailures += 1;
        this.logger.warn('Gallery photo R2 delete failed during event teardown', {
          eventId: input.eventId,
          photoId: photo.id.toString(),
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }
    if (photos.length > 0) {
      await this.galleryPhotoRepo.deleteAllByEventId(input.eventId);
    }

    await this.eventRepo.delete(input.eventId);

    await this.auditRecorder.record({
      academyId: actor.academyId,
      actorUserId: input.actorUserId,
      action: 'EVENT_DELETED',
      entityType: 'EVENT',
      entityId: input.eventId,
      context: {
        galleryPhotosDeleted: String(photos.length),
        galleryStorageFailures: String(storageDeleteFailures),
      },
    });

    return ok({ deleted: true as const });
  }
}
