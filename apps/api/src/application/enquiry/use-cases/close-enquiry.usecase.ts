import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EnquiryRepository } from '@domain/enquiry/ports/enquiry.repository';
import type { ClosureReason } from '@domain/enquiry/entities/enquiry.entity';
import { EnquiryErrors } from '../../common/errors';
import { toEnquiryDetail } from './get-enquiry-detail.usecase';
import type { EnquiryDetailOutput } from './get-enquiry-detail.usecase';
import type { UserRole } from '@playconnect/contracts';

export interface CloseEnquiryInput {
  actorUserId: string;
  actorRole: UserRole;
  enquiryId: string;
  closureReason: ClosureReason;
  convertedStudentId?: string;
}

export class CloseEnquiryUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly enquiryRepo: EnquiryRepository,
  ) {}

  async execute(input: CloseEnquiryInput): Promise<Result<EnquiryDetailOutput, AppError>> {
    if (input.actorRole !== 'OWNER') {
      return err(EnquiryErrors.closeNotAllowed());
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

    const closed = enquiry.close(input.closureReason, input.convertedStudentId);
    await this.enquiryRepo.save(closed);
    return ok(toEnquiryDetail(closed));
  }
}
