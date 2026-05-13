import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import type { GalleryPhotoRepository } from '@domain/event/ports/gallery-photo.repository';
import { GalleryPhoto } from '@domain/event/entities/gallery-photo.entity';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import { GalleryErrors, EventErrors } from '../../common/errors';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import type { UserRole } from '@academyflo/contracts';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
  extensionForMime,
} from '@shared/utils/image-validation';

/**
 * Cap on gallery photos per event. L3 fix: was previously a hardcoded `50`
 * in two places + the user-facing error message — easy to drift. Centralised
 * here so the cap, the checks, and the error message stay in lockstep.
 */
export const MAX_PHOTOS_PER_EVENT = 50;

export interface UploadGalleryPhotoInput {
  actorUserId: string;
  actorRole: UserRole;
  eventId: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  caption?: string | null;
}

export interface UploadGalleryPhotoOutput {
  id: string;
  eventId: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: string;
}

export class UploadGalleryPhotoUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly eventRepo: EventRepository,
    private readonly galleryPhotoRepo: GalleryPhotoRepository,
    private readonly fileStorage: FileStoragePort,
    private readonly auditRecorder: AuditRecorderPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    input: UploadGalleryPhotoInput,
  ): Promise<Result<UploadGalleryPhotoOutput, AppError>> {
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

    // Pre-flight max-photos check (UX): bail early if we're already at the
    // cap so we don't burn an upload+audit cycle. The post-save check below
    // is the actual race-safe guard.
    const photoCount = await this.galleryPhotoRepo.countByEventId(input.eventId);
    if (photoCount >= MAX_PHOTOS_PER_EVENT) {
      return err(GalleryErrors.maxPhotosReached(MAX_PHOTOS_PER_EVENT));
    }

    // Validate file
    if (input.buffer.length > MAX_IMAGE_FILE_SIZE) {
      return err(AppErrorClass.validation('File size must not exceed 5MB'));
    }

    // Detect actual MIME type from buffer magic bytes instead of trusting client
    let actualMime = input.mimeType;
    const header = input.buffer.subarray(0, 4);
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
      actualMime = 'image/png';
    } else if (header[0] === 0xff && header[1] === 0xd8) {
      actualMime = 'image/jpeg';
    } else if (
      header[0] === 0x52 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x46
    ) {
      actualMime = 'image/webp';
    }

    if (
      !ALLOWED_IMAGE_MIME_TYPES.includes(actualMime as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])
    ) {
      return err(AppErrorClass.validation('Only JPEG, PNG, and WebP images are allowed'));
    }

    // Upload to Cloudinary
    const ext = extensionForMime(actualMime);
    const filename = `${uuidv4()}.${ext}`;
    const folder = `gallery/${actor.academyId}/${input.eventId}`;

    let url: string;
    try {
      const result = await this.fileStorage.upload(folder, filename, input.buffer, actualMime);
      url = result.url;
    } catch (e) {
      // Distinguish transient (network/timeout) from terminal (auth/quota)
      // failures so the client can decide whether retrying is sensible.
      const errLike = e as { code?: string; name?: string; message?: string };
      const code = (errLike.code ?? errLike.name ?? '').toLowerCase();
      const message = errLike.message ?? '';
      if (code.includes('timeout') || code.includes('econn') || code.includes('network')) {
        return err(new AppErrorClass('NETWORK', 'Could not reach storage service. Please retry.'));
      }
      if (code.includes('accessdenied') || code.includes('forbidden')) {
        return err(
          new AppErrorClass(
            'UPLOAD_FAILED',
            'Storage service rejected the upload (permissions). Contact support.',
          ),
        );
      }
      // Surface root cause to structured logs (not raw console) so ops can
      // diagnose without leaking provider internals to the API consumer.
      this.logger.error('Gallery storage upload failed', { code, message });
      return err(GalleryErrors.uploadFailed());
    }

    // Save gallery photo record
    const photoId = new Types.ObjectId().toString();
    const photo = GalleryPhoto.create({
      id: photoId,
      eventId: input.eventId,
      academyId: actor.academyId,
      url,
      caption: input.caption?.trim().slice(0, 500) ?? null,
      uploadedBy: input.actorUserId,
      uploadedByName: actor.fullName,
    });

    await this.galleryPhotoRepo.save(photo);

    // H1 fix: race-safe cap enforcement with a deterministic winner.
    //
    // Prior bug: both code paths used `count > MAX`, so two concurrent
    // requests at count=N-1 would BOTH save (count → N+1), BOTH see
    // `finalCount > MAX`, BOTH roll back. Net result: zero photos saved,
    // two failures, two orphan blobs cleaned up. The cap held but the
    // legitimate uploaders both lost.
    //
    // Fixed approach: list all photos sorted ASC by (createdAt, id) and
    // keep the first MAX_PHOTOS_PER_EVENT — first-to-save wins. If THIS
    // photo is beyond position MAX-1 it's the over-quota straggler and
    // rolls back. Repo returns DESC by createdAt for UI use, so we sort
    // a local copy ASC for fairness reasoning. The id tiebreaker handles
    // same-millisecond saves.
    //
    //   - 49 photos exist, two racers both insert → 51 total. Sorted ASC,
    //     the late racer is at index 50 (>= MAX). Only it rolls back.
    //     One success, one error — the right outcome.
    //   - Single uploader at count=49 is at index 49 (< MAX), keeps it.
    const allPhotos = await this.galleryPhotoRepo.listByEventId(input.eventId);
    const sortedAsc = [...allPhotos].sort((a, b) => {
      const t = a.audit.createdAt.getTime() - b.audit.createdAt.getTime();
      if (t !== 0) return t;
      return a.id.toString().localeCompare(b.id.toString());
    });
    const myIndex = sortedAsc.findIndex((p) => p.id.toString() === photoId);
    if (myIndex === -1 || myIndex >= MAX_PHOTOS_PER_EVENT) {
      await this.galleryPhotoRepo.delete(photoId).catch(() => {
        /* best-effort */
      });
      await this.fileStorage.delete(url).catch(() => {
        /* best-effort */
      });
      return err(GalleryErrors.maxPhotosReached(MAX_PHOTOS_PER_EVENT));
    }

    // M6 fix: include eventId + filename so the audit trail is navigable
    // ("who uploaded what to which event"). URL deliberately omitted —
    // gallery photos can include minors so we keep the path out of audit.
    await this.auditRecorder.record({
      academyId: actor.academyId,
      actorUserId: input.actorUserId,
      action: 'GALLERY_PHOTO_UPLOADED',
      entityType: 'GALLERY_PHOTO',
      entityId: photoId,
      context: {
        eventId: input.eventId,
        originalName: input.originalName,
      },
    });

    return ok({
      id: photo.id.toString(),
      eventId: photo.eventId,
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl,
      caption: photo.caption,
      uploadedBy: photo.uploadedBy,
      uploadedByName: photo.uploadedByName,
      createdAt: photo.audit.createdAt.toISOString(),
    });
  }
}
