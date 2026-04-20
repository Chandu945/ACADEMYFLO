import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EnquiryRepository, EnquirySummaryResult } from '@domain/enquiry/ports/enquiry.repository';
import { EnquiryErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';

export interface GetEnquirySummaryInput {
  actorUserId: string;
  actorRole: UserRole;
}

export class GetEnquirySummaryUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly enquiryRepo: EnquiryRepository,
  ) {}

  async execute(input: GetEnquirySummaryInput): Promise<Result<EnquirySummaryResult, AppError>> {
    if (input.actorRole !== 'OWNER' && input.actorRole !== 'STAFF') {
      return err(EnquiryErrors.manageNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(EnquiryErrors.academyRequired());
    }

    const summary = await this.enquiryRepo.summary(actor.academyId);
    return ok(summary);
  }
}
