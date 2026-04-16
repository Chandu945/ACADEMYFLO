import { v4 as uuidv4 } from 'uuid';
import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { Student } from '@domain/student/entities/student.entity';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import { StudentErrors } from '../../common/errors';
import type { UserRole } from '@playconnect/contracts';
import { AppError as AppErrorClass } from '@shared/kernel';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
  extensionForMime,
  validateImageBuffer,
} from '@shared/utils/image-validation';

export interface UploadStudentPhotoInput {
  actorUserId: string;
  actorRole: UserRole;
  studentId: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export class UploadStudentPhotoUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(input: UploadStudentPhotoInput): Promise<Result<{ url: string }, AppError>> {
    if (input.actorRole !== 'OWNER' && input.actorRole !== 'STAFF') {
      return err(StudentErrors.manageNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(StudentErrors.academyRequired());
    }

    const student = await this.studentRepo.findById(input.studentId);
    if (!student || student.isDeleted()) {
      return err(StudentErrors.notFound(input.studentId));
    }

    if (student.academyId !== actor.academyId) {
      return err(StudentErrors.notInAcademy());
    }
    const loadedVersion = student.audit.version;

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

    // Upload new photo FIRST, then delete the old one only if upload + save succeeded.
    // If we delete first and the upload fails, the student loses their photo entirely
    // with no way to recover.
    const ext = extensionForMime(input.mimeType);
    const filename = `${uuidv4()}.${ext}`;
    const folder = `students/${actor.academyId}`;

    const { url } = await this.fileStorage.upload(folder, filename, input.buffer, input.mimeType);

    const previousUrl = student.profilePhotoUrl;
    const updated = Student.reconstitute(input.studentId, {
      ...student['props'],
      profilePhotoUrl: url,
      audit: updateAuditFields(student.audit),
    });

    const saved = await this.studentRepo.saveWithVersionPrecondition(updated, loadedVersion);
    if (!saved) {
      // Concurrent edit won — the new file we just uploaded is orphaned (will
      // be GC'd). Tell the caller to reload and retry.
      try { await this.fileStorage.delete(url); } catch { /* best effort */ }
      return err(StudentErrors.concurrencyConflict());
    }

    // Best-effort cleanup of the old photo. If this fails, we orphan a file in R2
    // rather than leaving the student with a broken URL.
    if (previousUrl) {
      try {
        await this.fileStorage.delete(previousUrl);
      } catch {
        // Intentionally swallowed — the student now points at the new URL; the
        // old file will be cleaned up by storage GC eventually.
      }
    }

    return ok({ url });
  }
}
