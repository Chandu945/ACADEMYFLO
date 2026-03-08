import { randomUUID } from 'crypto';
import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EnquiryRepository } from '@domain/enquiry/ports/enquiry.repository';
import { EnquiryErrors } from '../../common/errors';
import { toEnquiryDetail } from './get-enquiry-detail.usecase';
import type { EnquiryDetailOutput } from './get-enquiry-detail.usecase';
import type { UserRole } from '@playconnect/contracts';

export interface AddFollowUpInput {
  actorUserId: string;
  actorRole: UserRole;
  enquiryId: string;
  date: string;
  notes: string;
  nextFollowUpDate?: string | null;
}

export class AddFollowUpUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly enquiryRepo: EnquiryRepository,
  ) {}

  async execute(input: AddFollowUpInput): Promise<Result<EnquiryDetailOutput, AppError>> {
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
      return err(EnquiryErrors.closedCannotFollowUp());
    }

    if (!input.notes || input.notes.trim().length < 1) {
      return err(AppErrorClass.validation('Follow-up notes are required'));
    }

    const followUpDate = new Date(input.date);
    const nextFollowUp = input.nextFollowUpDate ? new Date(input.nextFollowUpDate) : null;

    const updated = enquiry.addFollowUp({
      id: randomUUID(),
      date: followUpDate,
      notes: input.notes.trim(),
      nextFollowUpDate: nextFollowUp,
      createdBy: input.actorUserId,
      createdAt: new Date(),
    });

    await this.enquiryRepo.save(updated);
    return ok(toEnquiryDetail(updated));
  }
}
