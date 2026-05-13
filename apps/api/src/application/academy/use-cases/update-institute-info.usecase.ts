import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { BankDetails } from '@domain/academy/entities/academy.entity';
import { validateBankDetails, validateUpiId } from '@domain/academy/rules/institute-info.rules';
import { InstituteInfoErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';

export interface UpdateInstituteInfoInput {
  actorUserId: string;
  actorRole: UserRole;
  bankDetails?: BankDetails | null;
  upiId?: string | null;
  upiHolderName?: string | null;
  manualPaymentsEnabled?: boolean;
}

export interface InstituteInfoDto {
  signatureStampUrl: string | null;
  bankDetails: BankDetails | null;
  upiId: string | null;
  upiHolderName: string | null;
  qrCodeImageUrl: string | null;
  manualPaymentsEnabled: boolean;
}

export class UpdateInstituteInfoUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
    /** M3 academy-onboarding fix: records ACADEMY_INSTITUTE_INFO_UPDATED.
     *  Optional so legacy fixtures keep compiling. */
    private readonly auditRecorder?: AuditRecorderPort,
  ) {}

  async execute(input: UpdateInstituteInfoInput): Promise<Result<InstituteInfoDto, AppError>> {
    if (input.actorRole !== 'OWNER') {
      return err(InstituteInfoErrors.updateNotAllowed());
    }

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(InstituteInfoErrors.academyRequired());

    const academy = await this.academyRepo.findById(user.academyId);
    if (!academy) return err(InstituteInfoErrors.academyRequired());

    if (input.bankDetails !== undefined && input.bankDetails !== null) {
      const bankCheck = validateBankDetails(input.bankDetails);
      if (!bankCheck.valid) return err(AppErrorClass.validation(bankCheck.reason!));
    }

    if (input.upiId !== undefined && input.upiId !== null) {
      const upiCheck = validateUpiId(input.upiId);
      if (!upiCheck.valid) return err(AppErrorClass.validation(upiCheck.reason!));
    }

    // M5 academy-onboarding fix: capture pre-update snapshot for both the
    // CAS precondition AND the audit diff. The version we read before the
    // update is what the CAS save must still see in the DB — anything else
    // means a concurrent writer beat us to it.
    const loadedVersion = academy.audit.version;
    const previousInfo = academy.instituteInfo;

    const updated = academy.updateInstituteInfo({
      bankDetails: input.bankDetails,
      upiId: input.upiId,
      upiHolderName: input.upiHolderName,
      manualPaymentsEnabled: input.manualPaymentsEnabled,
    });

    // M5: CAS write. Without this, two concurrent owner sessions saving
    // different fields would silently lose one of the writes (last write
    // wins). The conflict surfaces as a typed error so the client can
    // refetch and retry.
    const saved = await this.academyRepo.saveWithVersionPrecondition(updated, loadedVersion);
    if (!saved) return err(InstituteInfoErrors.concurrencyConflict());

    const info = updated.instituteInfo;

    // M3 audit: include a flag per changed field so the row is self-
    // describing without diffing previous-vs-current values. The actual
    // sensitive values (UPI ID, bank account number) are intentionally
    // NOT included in the context — only "what changed" — to keep PII out
    // of the audit feed.
    if (this.auditRecorder) {
      const changedFields: string[] = [];
      if (input.bankDetails !== undefined && input.bankDetails !== previousInfo.bankDetails)
        changedFields.push('bankDetails');
      if (input.upiId !== undefined && input.upiId !== previousInfo.upiId)
        changedFields.push('upiId');
      if (input.upiHolderName !== undefined && input.upiHolderName !== previousInfo.upiHolderName)
        changedFields.push('upiHolderName');
      if (
        input.manualPaymentsEnabled !== undefined &&
        input.manualPaymentsEnabled !== previousInfo.manualPaymentsEnabled
      )
        changedFields.push('manualPaymentsEnabled');
      if (changedFields.length > 0) {
        await this.auditRecorder
          .record({
            academyId: user.academyId,
            actorUserId: input.actorUserId,
            action: 'ACADEMY_INSTITUTE_INFO_UPDATED',
            entityType: 'ACADEMY',
            entityId: user.academyId,
            context: {
              changedFields: changedFields.join(','),
              manualPaymentsEnabled: String(info.manualPaymentsEnabled),
            },
          })
          .catch(() => {});
      }
    }

    return ok({
      signatureStampUrl: info.signatureStampUrl,
      bankDetails: info.bankDetails,
      upiId: info.upiId,
      upiHolderName: info.upiHolderName,
      qrCodeImageUrl: info.qrCodeImageUrl,
      manualPaymentsEnabled: info.manualPaymentsEnabled,
    });
  }
}
