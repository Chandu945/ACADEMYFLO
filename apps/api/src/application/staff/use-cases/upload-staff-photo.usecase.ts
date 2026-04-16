import { v4 as uuidv4 } from 'uuid';
import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
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

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(input.mimeType as typeof ALLOWED_IMAGE_MIME_TYPES[number])) {
      return err(AppErrorClass.validation('Only JPEG, PNG, and WebP images are allowed'));
    }

    if (input.buffer.length > MAX_IMAGE_FILE_SIZE) {
      return err(AppErrorClass.validation('File size must not exceed 5MB'));
    }

    const bufferCheck = validateImageBuffer(input.buffer, input.mimeType);
    if (!bufferCheck.valid) {
      return err(AppErrorClass.validation(bufferCheck.reason));
    }

    // Delete old photo if exists
    if (staff.profilePhotoUrl) {
      await this.fileStorage.delete(staff.profilePhotoUrl);
    }

    const ext = extensionForMime(input.mimeType);
    const filename = `${uuidv4()}.${ext}`;
    const folder = `staff/${actor.academyId}`;

    const { url } = await this.fileStorage.upload(folder, filename, input.buffer, input.mimeType);

    // Use the entity's own method instead of poking at private `props`.
    const updated = staff.updateProfilePhoto(url);

    await this.userRepo.save(updated);

    return ok({ url });
  }
}
