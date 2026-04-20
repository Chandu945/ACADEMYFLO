import type { AuditFields } from '@shared/kernel';
import { Entity, UniqueId, createAuditFields, updateAuditFields } from '@shared/kernel';
import type { EnquiryStatus, EnquirySource, ClosureReason } from '@academyflo/contracts';

export type { EnquiryStatus, EnquirySource, ClosureReason } from '@academyflo/contracts';

// Strip whitespace and dashes from phone-like inputs so dedup
// `findActiveByMobileAndAcademy` can match "+91 98765 43210" against
// "+919876543210". Keeps the leading + (preserves country code intent).
// We don't enforce E.164 here — DTO regex already covers that — we just
// normalize so input variants converge to one canonical form.
function normalizePhoneInput(raw: string): string {
  return raw.replace(/[\s\-()]/g, '');
}

export interface FollowUp {
  id: string;
  date: Date;
  notes: string;
  nextFollowUpDate: Date | null;
  createdBy: string;
  createdAt: Date;
}

export interface EnquiryProps {
  academyId: string;
  prospectName: string;
  guardianName: string | null;
  mobileNumber: string;
  whatsappNumber: string | null;
  email: string | null;
  address: string | null;
  interestedIn: string | null;
  source: EnquirySource | null;
  notes: string | null;
  status: EnquiryStatus;
  closureReason: ClosureReason | null;
  convertedStudentId: string | null;
  closedBy: string | null;
  closedAt: Date | null;
  nextFollowUpDate: Date | null;
  followUps: FollowUp[];
  createdBy: string;
  audit: AuditFields;
}

export class Enquiry extends Entity<EnquiryProps> {
  private constructor(id: UniqueId, props: EnquiryProps) {
    super(id, props);
  }

  static create(params: {
    id: string;
    academyId: string;
    prospectName: string;
    guardianName?: string | null;
    mobileNumber: string;
    whatsappNumber?: string | null;
    email?: string | null;
    address?: string | null;
    interestedIn?: string | null;
    source?: EnquirySource | null;
    notes?: string | null;
    nextFollowUpDate?: Date | null;
    createdBy: string;
  }): Enquiry {
    return new Enquiry(new UniqueId(params.id), {
      academyId: params.academyId,
      prospectName: params.prospectName.trim(),
      guardianName: params.guardianName ?? null,
      mobileNumber: normalizePhoneInput(params.mobileNumber),
      whatsappNumber: params.whatsappNumber ? normalizePhoneInput(params.whatsappNumber) : null,
      email: params.email ? params.email.trim().toLowerCase() : null,
      address: params.address ?? null,
      interestedIn: params.interestedIn ?? null,
      source: params.source ?? null,
      notes: params.notes ?? null,
      status: 'ACTIVE',
      closureReason: null,
      convertedStudentId: null,
      closedBy: null,
      closedAt: null,
      nextFollowUpDate: params.nextFollowUpDate ?? null,
      followUps: [],
      createdBy: params.createdBy,
      audit: createAuditFields(),
    });
  }

  static reconstitute(id: string, props: EnquiryProps): Enquiry {
    return new Enquiry(new UniqueId(id), props);
  }

  get academyId(): string { return this.props.academyId; }
  get prospectName(): string { return this.props.prospectName; }
  get guardianName(): string | null { return this.props.guardianName; }
  get mobileNumber(): string { return this.props.mobileNumber; }
  get whatsappNumber(): string | null { return this.props.whatsappNumber; }
  get email(): string | null { return this.props.email; }
  get address(): string | null { return this.props.address; }
  get interestedIn(): string | null { return this.props.interestedIn; }
  get source(): EnquirySource | null { return this.props.source; }
  get notes(): string | null { return this.props.notes; }
  get status(): EnquiryStatus { return this.props.status; }
  get closureReason(): ClosureReason | null { return this.props.closureReason; }
  get convertedStudentId(): string | null { return this.props.convertedStudentId; }
  get closedBy(): string | null { return this.props.closedBy; }
  get closedAt(): Date | null { return this.props.closedAt; }
  get nextFollowUpDate(): Date | null { return this.props.nextFollowUpDate; }
  get followUps(): FollowUp[] { return this.props.followUps; }
  get createdBy(): string { return this.props.createdBy; }
  get audit(): AuditFields { return this.props.audit; }

  get isActive(): boolean { return this.props.status === 'ACTIVE'; }

  update(params: {
    prospectName?: string;
    guardianName?: string | null;
    mobileNumber?: string;
    whatsappNumber?: string | null;
    email?: string | null;
    address?: string | null;
    interestedIn?: string | null;
    source?: EnquirySource | null;
    notes?: string | null;
    nextFollowUpDate?: Date | null;
  }): Enquiry {
    return Enquiry.reconstitute(this.id.toString(), {
      ...this.props,
      prospectName: params.prospectName !== undefined ? params.prospectName.trim() : this.props.prospectName,
      guardianName: params.guardianName !== undefined ? params.guardianName : this.props.guardianName,
      mobileNumber: params.mobileNumber !== undefined ? normalizePhoneInput(params.mobileNumber) : this.props.mobileNumber,
      whatsappNumber: params.whatsappNumber !== undefined
        ? (params.whatsappNumber ? normalizePhoneInput(params.whatsappNumber) : null)
        : this.props.whatsappNumber,
      email: params.email !== undefined
        ? (params.email ? params.email.trim().toLowerCase() : null)
        : this.props.email,
      address: params.address !== undefined ? params.address : this.props.address,
      interestedIn: params.interestedIn !== undefined ? params.interestedIn : this.props.interestedIn,
      source: params.source !== undefined ? params.source : this.props.source,
      notes: params.notes !== undefined ? params.notes : this.props.notes,
      nextFollowUpDate: params.nextFollowUpDate !== undefined ? params.nextFollowUpDate : this.props.nextFollowUpDate,
      audit: updateAuditFields(this.props.audit),
    });
  }

  addFollowUp(followUp: FollowUp): Enquiry {
    return Enquiry.reconstitute(this.id.toString(), {
      ...this.props,
      followUps: [...this.props.followUps, followUp],
      nextFollowUpDate: followUp.nextFollowUpDate ?? null,
      audit: updateAuditFields(this.props.audit),
    });
  }

  close(reason: ClosureReason, closedBy: string, closedAt: Date, convertedStudentId?: string): Enquiry {
    return Enquiry.reconstitute(this.id.toString(), {
      ...this.props,
      status: 'CLOSED',
      closureReason: reason,
      convertedStudentId: convertedStudentId ?? null,
      closedBy,
      closedAt,
      nextFollowUpDate: null,
      audit: updateAuditFields(this.props.audit),
    });
  }
}
