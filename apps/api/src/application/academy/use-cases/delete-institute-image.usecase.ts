import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { InstituteInfoErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';
import type { ImageType } from './upload-institute-image.usecase';

export interface DeleteInstituteImageInput {
  actorUserId: string;
  actorRole: UserRole;
  imageType: ImageType;
}

export class DeleteInstituteImageUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly fileStorage: FileStoragePort,
    /** M3 academy-onboarding fix: records ACADEMY_INSTITUTE_IMAGE_DELETED.
     *  Optional so legacy fixtures keep compiling. */
    private readonly auditRecorder?: AuditRecorderPort,
  ) {}

  async execute(input: DeleteInstituteImageInput): Promise<Result<{ success: true }, AppError>> {
    if (input.actorRole !== 'OWNER') {
      return err(InstituteInfoErrors.updateNotAllowed());
    }

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(InstituteInfoErrors.academyRequired());

    const academy = await this.academyRepo.findById(user.academyId);
    if (!academy) return err(InstituteInfoErrors.academyRequired());

    const info = academy.instituteInfo;
    const oldUrl = input.imageType === 'signature' ? info.signatureStampUrl : info.qrCodeImageUrl;

    // Delete is best-effort: an R2 hiccup shouldn't block the user from
    // clearing the field. The orphaned object can be reaped by a later
    // storage GC pass; without the catch, the user would be stuck on a
    // stale image.
    if (oldUrl) {
      await this.fileStorage.delete(oldUrl).catch(() => {});
    }

    const updateParams =
      input.imageType === 'signature' ? { signatureStampUrl: null } : { qrCodeImageUrl: null };

    const updated = academy.updateInstituteInfo(updateParams);
    await this.academyRepo.save(updated);

    // M3 academy-onboarding fix: surface the deletion (and the old URL it
    // pointed at) in the audit feed. Useful when investigating "the
    // receipt template lost its signature stamp last month — who?".
    if (this.auditRecorder) {
      await this.auditRecorder
        .record({
          academyId: user.academyId,
          actorUserId: input.actorUserId,
          action: 'ACADEMY_INSTITUTE_IMAGE_DELETED',
          entityType: 'ACADEMY',
          entityId: user.academyId,
          context: {
            imageType: input.imageType,
            previousUrl: oldUrl ?? '',
          },
        })
        .catch(() => {});
    }

    return ok({ success: true });
  }
}
