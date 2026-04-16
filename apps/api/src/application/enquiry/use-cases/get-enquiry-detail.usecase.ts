import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EnquiryRepository } from '@domain/enquiry/ports/enquiry.repository';
import type { Enquiry } from '@domain/enquiry/entities/enquiry.entity';
import { EnquiryErrors } from '../../common/errors';
import type { UserRole } from '@playconnect/contracts';

export interface GetEnquiryDetailInput {
  actorUserId: string;
  actorRole: UserRole;
  enquiryId: string;
}

export interface EnquiryDetailOutput {
  id: string;
  prospectName: string;
  guardianName: string | null;
  mobileNumber: string;
  whatsappNumber: string | null;
  email: string | null;
  address: string | null;
  interestedIn: string | null;
  source: string | null;
  notes: string | null;
  status: string;
  closureReason: string | null;
  convertedStudentId: string | null;
  closedBy: string | null;
  closedAt: string | null;
  nextFollowUpDate: string | null;
  followUps: {
    id: string;
    date: string;
    notes: string;
    nextFollowUpDate: string | null;
    createdBy: string;
    createdAt: string;
  }[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function toEnquiryDetail(e: Enquiry): EnquiryDetailOutput {
  return {
    id: e.id.toString(),
    prospectName: e.prospectName,
    guardianName: e.guardianName,
    mobileNumber: e.mobileNumber,
    whatsappNumber: e.whatsappNumber,
    email: e.email,
    address: e.address,
    interestedIn: e.interestedIn,
    source: e.source,
    notes: e.notes,
    status: e.status,
    closureReason: e.closureReason,
    convertedStudentId: e.convertedStudentId,
    closedBy: e.closedBy,
    closedAt: e.closedAt?.toISOString() ?? null,
    nextFollowUpDate: e.nextFollowUpDate?.toISOString() ?? null,
    followUps: e.followUps.map((f) => ({
      id: f.id,
      date: f.date.toISOString(),
      notes: f.notes,
      nextFollowUpDate: f.nextFollowUpDate?.toISOString() ?? null,
      createdBy: f.createdBy,
      createdAt: f.createdAt.toISOString(),
    })),
    createdBy: e.createdBy,
    createdAt: e.audit.createdAt.toISOString(),
    updatedAt: e.audit.updatedAt.toISOString(),
  };
}

export class GetEnquiryDetailUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly enquiryRepo: EnquiryRepository,
  ) {}

  async execute(input: GetEnquiryDetailInput): Promise<Result<EnquiryDetailOutput, AppError>> {
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

    return ok(toEnquiryDetail(enquiry));
  }
}
