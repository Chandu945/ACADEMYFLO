import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EnquiryRepository } from '@domain/enquiry/ports/enquiry.repository';
import type { ClosureReason } from '@domain/enquiry/entities/enquiry.entity';
import { EnquiryErrors } from '../../common/errors';
import { toEnquiryDetail } from './get-enquiry-detail.usecase';
import type { EnquiryDetailOutput } from './get-enquiry-detail.usecase';
import type { UserRole } from '@academyflo/contracts';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';

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
    private readonly auditRecorder: AuditRecorderPort,
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

    const loadedVersion = enquiry.audit.version;
    const closed = enquiry.close(input.closureReason, input.actorUserId, new Date(), input.convertedStudentId);
    const saved = await this.enquiryRepo.saveWithVersionPrecondition(closed, loadedVersion);
    if (!saved) return err(EnquiryErrors.concurrencyConflict());

    await this.auditRecorder.record({
      academyId: actor.academyId,
      actorUserId: input.actorUserId,
      action: 'ENQUIRY_CLOSED',
      entityType: 'ENQUIRY',
      entityId: input.enquiryId,
      context: {
        closureReason: input.closureReason,
        ...(input.convertedStudentId ? { convertedStudentId: input.convertedStudentId } : {}),
      },
    });

    return ok(toEnquiryDetail(closed));
  }
}
