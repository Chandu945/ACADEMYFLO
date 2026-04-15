import { v4 as uuidv4 } from 'uuid';
import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { StudentRepository } from '@domain/student/ports/student.repository';
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
  ) {}

  async execute(input: UploadProfilePhotoInput): Promise<Result<UploadProfilePhotoOutput, AppError>> {
    const user = await this.userRepo.findById(input.actorUserId);
    if (!user) {
      return err(AuthErrors.invalidCredentials());
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
    if (user.profilePhotoUrl) {
      await this.fileStorage.delete(user.profilePhotoUrl);
    }

    const ext = extensionForMime(input.mimeType);
    const filename = `${uuidv4()}.${ext}`;
    const folder = user.academyId ? `profiles/${user.academyId}` : `profiles/${input.actorUserId}`;

    const { url } = await this.fileStorage.upload(folder, filename, input.buffer, input.mimeType);

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
