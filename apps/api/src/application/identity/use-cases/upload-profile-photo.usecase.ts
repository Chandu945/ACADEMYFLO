import { v4 as uuidv4 } from 'uuid';
import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { LoggerPort } from '@shared/logging/logger.port';
import { Student } from '@domain/student/entities/student.entity';
import { AuthErrors } from '../../common/errors';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
  extensionForMime,
  validateImageBuffer,
} from '@shared/utils/image-validation';

export interface UploadProfilePhotoInput {
  actorUserId: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export interface UploadProfilePhotoOutput {
  url: string;
  updatedStudentIds: string[];
}

export class UploadProfilePhotoUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly fileStorage: FileStoragePort,
    private readonly parentLinkRepo: ParentStudentLinkRepository | null,
    private readonly studentRepo: StudentRepository | null,
    /**
     * M2 identity-audit fix: log R2 upload failures so ops can see what
     * the user just saw. Optional so legacy fixtures stay compatible —
     * without it, errors still surface as typed AppErrors, just without
     * the ops-side trace.
     */
    private readonly logger?: LoggerPort,
  ) {}

  async execute(
    input: UploadProfilePhotoInput,
  ): Promise<Result<UploadProfilePhotoOutput, AppError>> {
    const user = await this.userRepo.findById(input.actorUserId);
    if (!user) {
      return err(AuthErrors.invalidCredentials());
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

    // Delete old photo if exists
    if (user.profilePhotoUrl) {
      await this.fileStorage.delete(user.profilePhotoUrl);
    }

    const ext = extensionForMime(input.mimeType);
    const filename = `${uuidv4()}.${ext}`;
    const folder = user.academyId ? `profiles/${user.academyId}` : `profiles/${input.actorUserId}`;

    // M2 identity-audit fix: same upload-hardening pattern we shipped for
    // parent's payment-proof. Pre-fix code let any R2 failure bubble as a
    // raw 500. Now: timeout/network errors → NETWORK (retryable), terminal
    // errors → UPLOAD_FAILED (with an ops-side log entry).
    let url: string;
    try {
      const result = await this.fileStorage.upload(folder, filename, input.buffer, input.mimeType);
      url = result.url;
    } catch (e) {
      const errLike = e as { code?: string; name?: string; message?: string };
      const code = (errLike.code ?? errLike.name ?? '').toLowerCase();
      if (code.includes('timeout') || code.includes('econn') || code.includes('network')) {
        return err(new AppErrorClass('NETWORK', 'Could not reach storage service. Please retry.'));
      }
      this.logger?.error('Profile-photo storage upload failed', {
        code,
        message: errLike.message ?? '',
        userId: input.actorUserId,
        academyId: user.academyId ?? '',
      });
      return err(
        new AppErrorClass('UPLOAD_FAILED', 'Failed to upload profile photo. Please try again.'),
      );
    }

    // Update user profile photo
    const updatedUser = user.updateProfilePhoto(url);
    await this.userRepo.save(updatedUser);

    // If parent, propagate photo to all linked students
    const updatedStudentIds: string[] = [];
    if (user.role === 'PARENT' && this.parentLinkRepo && this.studentRepo) {
      const links = await this.parentLinkRepo.findByParentUserId(input.actorUserId);
      for (const link of links) {
        const student = await this.studentRepo.findById(link.studentId);
        if (student && !student.isDeleted()) {
          const updatedStudent = Student.reconstitute(student.id.toString(), {
            ...student['props'],
            profilePhotoUrl: url,
            audit: updateAuditFields(student.audit),
          });
          await this.studentRepo.save(updatedStudent);
          updatedStudentIds.push(student.id.toString());
        }
      }
    }

    return ok({ url, updatedStudentIds });
  }
}
