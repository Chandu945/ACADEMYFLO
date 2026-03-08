import { randomUUID } from 'crypto';
import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EnquiryRepository } from '@domain/enquiry/ports/enquiry.repository';
import { Enquiry } from '@domain/enquiry/entities/enquiry.entity';
import type { EnquirySource } from '@domain/enquiry/entities/enquiry.entity';
import { EnquiryErrors } from '../../common/errors';
import type { UserRole } from '@playconnect/contracts';

export interface CreateEnquiryInput {
  actorUserId: string;
  actorRole: UserRole;
  prospectName: string;
  guardianName?: string | null;
  mobileNumber: string;
  whatsappNumber?: string | null;
  email?: string | null;
  address?: string | null;
  interestedIn?: string | null;
  source?: EnquirySource | null;
  notes?: string | null;
  nextFollowUpDate?: string | null;
}

export interface CreateEnquiryOutput {
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
  nextFollowUpDate: string | null;
  followUps: unknown[];
  createdBy: string;
  createdAt: string;
  warning?: string;
}

export class CreateEnquiryUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly enquiryRepo: EnquiryRepository,
  ) {}

  async execute(input: CreateEnquiryInput): Promise<Result<CreateEnquiryOutput, AppError>> {
    if (input.actorRole !== 'OWNER' && input.actorRole !== 'STAFF') {
      return err(EnquiryErrors.manageNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(EnquiryErrors.academyRequired());
    }

    if (!input.prospectName || input.prospectName.trim().length < 2) {
      return err(AppErrorClass.validation('Prospect name must be at least 2 characters'));
    }
    if (!input.mobileNumber || !/^\d{10,15}$/.test(input.mobileNumber)) {
      return err(AppErrorClass.validation('Mobile number must be 10-15 digits'));
    }

    // Check for duplicate active enquiry (soft warning)
    const existing = await this.enquiryRepo.findActiveByMobileAndAcademy(
      actor.academyId,
      input.mobileNumber,
    );

    const nextFollowUp = input.nextFollowUpDate ? new Date(input.nextFollowUpDate) : null;

    const enquiry = Enquiry.create({
      id: randomUUID(),
      academyId: actor.academyId,
      prospectName: input.prospectName,
      guardianName: input.guardianName,
      mobileNumber: input.mobileNumber,
      whatsappNumber: input.whatsappNumber,
      email: input.email,
      address: input.address,
      interestedIn: input.interestedIn,
      source: input.source,
      notes: input.notes,
      nextFollowUpDate: nextFollowUp,
      createdBy: input.actorUserId,
    });

    await this.enquiryRepo.save(enquiry);

    const output: CreateEnquiryOutput = {
      id: enquiry.id.toString(),
      prospectName: enquiry.prospectName,
      guardianName: enquiry.guardianName,
      mobileNumber: enquiry.mobileNumber,
      whatsappNumber: enquiry.whatsappNumber,
      email: enquiry.email,
      address: enquiry.address,
      interestedIn: enquiry.interestedIn,
      source: enquiry.source,
      notes: enquiry.notes,
      status: enquiry.status,
      nextFollowUpDate: enquiry.nextFollowUpDate?.toISOString() ?? null,
      followUps: [],
      createdBy: enquiry.createdBy,
      createdAt: enquiry.audit.createdAt.toISOString(),
    };

    if (existing) {
      output.warning = 'An active enquiry with this mobile number already exists';
    }

    return ok(output);
  }
}
