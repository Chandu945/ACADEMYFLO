import { v4 as uuidv4 } from 'uuid';
import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { FileStoragePort } from '../../common/ports/file-storage.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { validateImageFile } from '@domain/academy/rules/institute-info.rules';
import { InstituteInfoErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';
import { extensionForMime, validateImageBuffer } from '@shared/utils/image-validation';

export type ImageType = 'signature' | 'qrcode';

export interface UploadInstituteImageInput {
  actorUserId: string;
  actorRole: UserRole;
  imageType: ImageType;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export interface UploadInstituteImageOutput {
  url: string;
}

export class UploadInstituteImageUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly fileStorage: FileStoragePort,
    /**
     * M4 academy-onboarding fix: log R2 failures so ops can see what the
     * user just saw. Optional for legacy fixtures.
     */
    private readonly logger?: LoggerPort,
    /**
     * M3 academy-onboarding fix: records ACADEMY_INSTITUTE_IMAGE_UPLOADED.
     */
    private readonly auditRecorder?: AuditRecorderPort,
  ) {}

  async execute(
    input: UploadInstituteImageInput,
  ): Promise<Result<UploadInstituteImageOutput, AppError>> {
    if (input.actorRole !== 'OWNER') {
      return err(InstituteInfoErrors.updateNotAllowed());
    }

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(InstituteInfoErrors.academyRequired());

    const academy = await this.academyRepo.findById(user.academyId);
    if (!academy) return err(InstituteInfoErrors.academyRequired());

    const fileCheck = validateImageFile(input.mimeType, input.buffer.length);
    if (!fileCheck.valid) return err(InstituteInfoErrors.invalidFile());

    const bufferCheck = await validateImageBuffer(input.buffer, input.mimeType);
    if (!bufferCheck.valid) return err(InstituteInfoErrors.invalidFile());

    const ext = extensionForMime(input.mimeType);
    const filename = `${uuidv4()}.${ext}`;
    const folder = `institute/${user.academyId}/${input.imageType}`;

    // Delete old file if exists. Failure here is best-effort — we'd rather
    // overwrite-and-orphan than block the user. Old URL still lives in the
    // academy doc until we save below, so a failure here doesn't desync
    // anything visible to the user.
    const info = academy.instituteInfo;
    const oldUrl = input.imageType === 'signature' ? info.signatureStampUrl : info.qrCodeImageUrl;
    if (oldUrl) {
      await this.fileStorage.delete(oldUrl).catch(() => {});
    }

    // M4 academy-onboarding fix: same upload-hardening shape used in parent
    // payment-proof + identity profile-photo. Pre-fix code let R2 failures
    // bubble as raw 500s. Now: timeout/network branch → NETWORK (retryable);
    // anything else → UPLOAD_FAILED with an ops-side log entry. The folder
    // path is scoped per academy so no cross-tenant leak path even on
    // partial-write conditions.
    let url: string;
    try {
      const result = await this.fileStorage.upload(folder, filename, input.buffer, input.mimeType);
      url = result.url;
    } catch (e) {
      const errLike = e as { code?: string; name?: string; message?: string };
      const code = (errLike.code ?? errLike.name ?? '').toLowerCase();
      if (code.includes('timeout') || code.includes('econn') || code.includes('network')) {
        return err(InstituteInfoErrors.networkUnavailable());
      }
      this.logger?.error('Institute-image storage upload failed', {
        code,
        message: errLike.message ?? '',
        academyId: user.academyId,
        imageType: input.imageType,
      });
      return err(InstituteInfoErrors.uploadFailed());
    }

    const updateParams =
      input.imageType === 'signature' ? { signatureStampUrl: url } : { qrCodeImageUrl: url };

    const updated = academy.updateInstituteInfo(updateParams);
    await this.academyRepo.save(updated);

    // M3 academy-onboarding fix: record the image swap. The previous URL is
    // included so forensic queries can chain "image swapped to X, then to Y"
    // without scanning storage for orphans.
    if (this.auditRecorder) {
      await this.auditRecorder
        .record({
          academyId: user.academyId,
          actorUserId: input.actorUserId,
          action: 'ACADEMY_INSTITUTE_IMAGE_UPLOADED',
          entityType: 'ACADEMY',
          entityId: user.academyId,
          context: {
            imageType: input.imageType,
            url,
            previousUrl: oldUrl ?? '',
          },
        })
        .catch(() => {});
    }

    return ok({ url });
  }
}
