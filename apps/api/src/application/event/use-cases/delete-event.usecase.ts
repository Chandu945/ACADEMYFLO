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
import type { TransactionPort } from '../../common/transaction.port';
import type { UserRole } from '@academyflo/contracts';

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
    private readonly transaction: TransactionPort,
  ) {}

  async execute(input: DeleteEventInput): Promise<Result<{ deleted: true }, AppError>> {
    if (input.actorRole !== 'OWNER') {
      return err(EventErrors.deleteNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) return err(EventErrors.academyRequired());
    const academyId = actor.academyId;

    const event = await this.eventRepo.findById(input.eventId);
    if (!event) return err(EventErrors.notFound(input.eventId));
    if (event.academyId !== academyId) return err(EventErrors.notInAcademy());

    // R2 blob deletes are best-effort and stay OUTSIDE the transaction —
    // a transient storage failure must not abort the user's delete. Orphaned
    // blobs are acceptable (404 on retry = no-op). The DB writes below are
    // wrapped in a transaction so photo rows and event row always commit or
    // roll back together; prior code could leave an event with its photos
    // already deleted, or orphaned photo rows pointing to a deleted event.
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

    await this.transaction.run(async () => {
      if (photos.length > 0) {
        await this.galleryPhotoRepo.deleteAllByEventId(input.eventId, academyId);
      }
      await this.eventRepo.delete(input.eventId, academyId);
    });

    await this.auditRecorder.record({
      academyId,
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
