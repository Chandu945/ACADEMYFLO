import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EnquiryRepository } from '@domain/enquiry/ports/enquiry.repository';
import type { EnquirySource } from '@domain/enquiry/entities/enquiry.entity';
import { EnquiryErrors } from '../../common/errors';
import { toEnquiryDetail } from './get-enquiry-detail.usecase';
import type { EnquiryDetailOutput } from './get-enquiry-detail.usecase';
import type { UserRole } from '@playconnect/contracts';

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
      nextFollowUpDate: input.nextFollowUpDate !== undefined
        ? (input.nextFollowUpDate ? new Date(input.nextFollowUpDate) : null)
        : undefined,
    });

    await this.enquiryRepo.save(updated);
    return ok(toEnquiryDetail(updated));
  }
}
