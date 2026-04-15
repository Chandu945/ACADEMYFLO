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
import type { UserRole } from '@playconnect/contracts';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
  extensionForMime,
} from '@shared/utils/image-validation';

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
  ) {}

  async execute(input: UploadGalleryPhotoInput): Promise<Result<UploadGalleryPhotoOutput, AppError>> {
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

    // Check max photos limit
    const photoCount = await this.galleryPhotoRepo.countByEventId(input.eventId);
    if (photoCount >= 50) {
      return err(GalleryErrors.maxPhotosReached());
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
    } else if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
      actualMime = 'image/webp';
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(actualMime as typeof ALLOWED_IMAGE_MIME_TYPES[number])) {
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
    } catch {
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

    await this.auditRecorder.record({
      academyId: actor.academyId,
      actorUserId: input.actorUserId,
      action: 'GALLERY_PHOTO_UPLOADED',
      entityType: 'GALLERY_PHOTO',
      entityId: photoId,
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
