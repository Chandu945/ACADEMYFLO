import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EnquiryRepository } from '@domain/enquiry/ports/enquiry.repository';
import { EnquiryErrors } from '../../common/errors';
import type { UserRole } from '@playconnect/contracts';

export interface ListEnquiriesInput {
  actorUserId: string;
  actorRole: UserRole;
  status?: 'ACTIVE' | 'CLOSED';
  search?: string;
  followUpToday?: boolean;
  page: number;
  pageSize: number;
}

export interface EnquiryListItem {
  id: string;
  prospectName: string;
  mobileNumber: string;
  interestedIn: string | null;
  source: string | null;
  status: string;
  nextFollowUpDate: string | null;
  followUpCount: number;
  createdAt: string;
}

export interface ListEnquiriesOutput {
  data: EnquiryListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ListEnquiriesUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly enquiryRepo: EnquiryRepository,
  ) {}

  async execute(input: ListEnquiriesInput): Promise<Result<ListEnquiriesOutput, AppError>> {
    if (input.actorRole !== 'OWNER' && input.actorRole !== 'STAFF') {
      return err(EnquiryErrors.manageNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(EnquiryErrors.academyRequired());
    }

    const { enquiries, total } = await this.enquiryRepo.list(
      {
        academyId: actor.academyId,
        status: input.status,
        search: input.search,
        followUpToday: input.followUpToday,
      },
      input.page,
      input.pageSize,
    );

    const data: EnquiryListItem[] = enquiries.map((e) => ({
      id: e.id.toString(),
      prospectName: e.prospectName,
      mobileNumber: e.mobileNumber,
      interestedIn: e.interestedIn,
      source: e.source,
      status: e.status,
      nextFollowUpDate: e.nextFollowUpDate?.toISOString() ?? null,
      followUpCount: e.followUps.length,
      createdAt: e.audit.createdAt.toISOString(),
    }));

    return ok({
      data,
      pagination: {
        page: input.page,
        limit: input.pageSize,
        total,
        totalPages: Math.ceil(total / input.pageSize) || 1,
      },
    });
  }
}
