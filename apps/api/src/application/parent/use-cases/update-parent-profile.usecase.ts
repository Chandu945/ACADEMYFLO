import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canViewOwnChildren } from '@domain/parent/rules/parent.rules';
import { ParentErrors } from '../../common/errors';
import type { ParentProfileDto } from '../dtos/parent.dto';
import type { UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';

export interface UpdateParentProfileInput {
  parentUserId: string;
  parentRole: UserRole;
  fullName?: string;
  phoneNumber?: string;
}

export class UpdateParentProfileUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    /**
     * Records USER_PROFILE_UPDATED in the audit feed (M3 parent-flows audit
     * fix). Optional so legacy fixtures keep compiling.
     */
    private readonly auditRecorder?: AuditRecorderPort,
  ) {}

  async execute(input: UpdateParentProfileInput): Promise<Result<ParentProfileDto, AppError>> {
    const check = canViewOwnChildren(input.parentRole);
    if (!check.allowed) {
      return err(AppErrorClass.forbidden('Only parents can update their profile here'));
    }

    const user = await this.userRepo.findById(input.parentUserId);
    if (!user) return err(ParentErrors.parentNotFound(input.parentUserId));

    const updated = user.updateProfile(input.fullName, input.phoneNumber);
    await this.userRepo.save(updated);

    // M3 fix (parent-flows audit): record the change so support can answer
    // "when did this user change their phone/name?" — useful both for fraud
    // investigations and for parents who claim their account was tampered
    // with. Context tracks which fields actually changed (vs. the no-op
    // case where the same value was resubmitted) so the audit row is
    // self-describing.
    if (this.auditRecorder) {
      const changedFields: string[] = [];
      if (input.fullName !== undefined && input.fullName !== user.fullName) {
        changedFields.push('fullName');
      }
      if (input.phoneNumber !== undefined && input.phoneNumber !== user.phoneE164) {
        changedFields.push('phoneNumber');
      }
      if (changedFields.length > 0) {
        await this.auditRecorder
          .record({
            academyId: user.academyId ?? 'UNKNOWN',
            actorUserId: input.parentUserId,
            action: 'USER_PROFILE_UPDATED',
            entityType: 'USER',
            entityId: input.parentUserId,
            context: { role: user.role, changedFields: changedFields.join(',') },
          })
          .catch(() => {});
      }
    }

    return ok({
      fullName: updated.fullName,
      email: updated.emailNormalized,
      phoneNumber: updated.phoneE164,
    });
  }
}
