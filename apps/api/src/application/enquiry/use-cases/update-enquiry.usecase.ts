import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EnquiryRepository } from '@domain/enquiry/ports/enquiry.repository';
import type { Enquiry, EnquirySource } from '@domain/enquiry/entities/enquiry.entity';
import { EnquiryErrors } from '../../common/errors';
import { toEnquiryDetail } from './get-enquiry-detail.usecase';
import type { EnquiryDetailOutput } from './get-enquiry-detail.usecase';
import type { UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';

export interface UpdateEnquiryInput {
  actorUserId: string;
  actorRole: UserRole;
  enquiryId: string;
  prospectName?: string;
  guardianName?: string | null;
  mobileNumber?: string;
  whatsappNumber?: string | null;
  email?: string | null;
  address?: string | null;
  interestedIn?: string | null;
  source?: EnquirySource | null;
  notes?: string | null;
  nextFollowUpDate?: string | null;
}

export class UpdateEnquiryUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly enquiryRepo: EnquiryRepository,
    private readonly auditRecorder: AuditRecorderPort,
  ) {}

  async execute(input: UpdateEnquiryInput): Promise<Result<EnquiryDetailOutput, AppError>> {
    if (input.actorRole !== 'OWNER' && input.actorRole !== 'STAFF') {
      return err(EnquiryErrors.manageNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(EnquiryErrors.academyRequired());
    }

    const enquiry = await this.enquiryRepo.findById(input.enquiryId);
    if (!enquiry || enquiry.academyId !== actor.academyId) {
      return err(EnquiryErrors.notFound(input.enquiryId));
    }

    if (!enquiry.isActive) {
      return err(EnquiryErrors.alreadyClosed());
    }

    if (input.prospectName !== undefined && input.prospectName.trim().length < 2) {
      return err(AppErrorClass.validation('Prospect name must be at least 2 characters'));
    }
    if (input.mobileNumber !== undefined && !/^\d{10,15}$/.test(input.mobileNumber)) {
      return err(AppErrorClass.validation('Mobile number must be 10-15 digits'));
    }

    // M4 fix: when mobile changes, re-check uniqueness against other active
    // enquiries in the academy. Prior code only ran the soft-warning on
    // create — so an owner could update enquiry A's mobile to match
    // enquiry B's, leaving two ACTIVE enquiries for the same prospect.
    // We surface a hard conflict rather than a soft warning here because
    // the user explicitly edited the field.
    if (input.mobileNumber !== undefined && input.mobileNumber !== enquiry.mobileNumber) {
      const collision = await this.enquiryRepo.findActiveByMobileAndAcademy(
        actor.academyId,
        input.mobileNumber,
      );
      if (collision && collision.id.toString() !== enquiry.id.toString()) {
        return err(
          AppErrorClass.conflict('Another active enquiry already exists with this mobile number'),
        );
      }
    }

    const loadedVersion = enquiry.audit.version;
    const updated = enquiry.update({
      prospectName: input.prospectName,
      guardianName: input.guardianName,
      mobileNumber: input.mobileNumber,
      whatsappNumber: input.whatsappNumber,
      email: input.email,
      address: input.address,
      interestedIn: input.interestedIn,
      source: input.source,
      notes: input.notes,
      nextFollowUpDate:
        input.nextFollowUpDate !== undefined
          ? input.nextFollowUpDate
            ? new Date(input.nextFollowUpDate)
            : null
          : undefined,
    });

    // M2 fix: compute the diff between the original enquiry and the merged
    // update so the audit log records WHICH fields changed (not just
    // "something changed"). Matches the pattern shipped for update-student
    // (M1) and update-event (M1) so audit trails stay consistent across
    // entities.
    const changedFields = diffChangedEnquiryFields(enquiry, updated);

    // M3 fix: no-op skip. If nothing actually changed (caller submitted the
    // same values, or only sent undefined fields), don't save and don't
    // audit. Avoids version-history churn and empty-update audit entries.
    if (changedFields.length === 0) {
      return ok(toEnquiryDetail(enquiry));
    }

    const saved = await this.enquiryRepo.saveWithVersionPrecondition(updated, loadedVersion);
    if (!saved) return err(EnquiryErrors.concurrencyConflict());

    await this.auditRecorder.record({
      academyId: actor.academyId,
      actorUserId: input.actorUserId,
      action: 'ENQUIRY_UPDATED',
      entityType: 'ENQUIRY',
      entityId: input.enquiryId,
      context: {
        prospectName: enquiry.prospectName,
        changedFields: changedFields.join(','),
      },
    });

    return ok(toEnquiryDetail(updated));
  }
}

/**
 * M2 helper: returns the list of fields that differ between the original
 * enquiry and the merged update. Nullable fields are normalised to null
 * before comparison so undefined vs null doesn't falsely register as a
 * change. Dates compared by getTime; followUps not compared (this use case
 * doesn't touch them).
 */
function diffChangedEnquiryFields(oldE: Enquiry, newE: Enquiry): string[] {
  const changed: string[] = [];
  if (oldE.prospectName !== newE.prospectName) changed.push('prospectName');
  if ((oldE.guardianName ?? null) !== (newE.guardianName ?? null)) changed.push('guardianName');
  if (oldE.mobileNumber !== newE.mobileNumber) changed.push('mobileNumber');
  if ((oldE.whatsappNumber ?? null) !== (newE.whatsappNumber ?? null))
    changed.push('whatsappNumber');
  if ((oldE.email ?? null) !== (newE.email ?? null)) changed.push('email');
  if ((oldE.address ?? null) !== (newE.address ?? null)) changed.push('address');
  if ((oldE.interestedIn ?? null) !== (newE.interestedIn ?? null)) changed.push('interestedIn');
  if ((oldE.source ?? null) !== (newE.source ?? null)) changed.push('source');
  if ((oldE.notes ?? null) !== (newE.notes ?? null)) changed.push('notes');
  const oldFu = oldE.nextFollowUpDate?.getTime() ?? null;
  const newFu = newE.nextFollowUpDate?.getTime() ?? null;
  if (oldFu !== newFu) changed.push('nextFollowUpDate');
  return changed;
}
