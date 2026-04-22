import type { AuditFields } from '@shared/kernel';
import { Entity, UniqueId, createAuditFields, updateAuditFields } from '@shared/kernel';
import type { PaymentRequestStatus } from '@academyflo/contracts';

/** Who authored the request — staff records cash collection, parent submits
 *  proof of an out-of-band UPI / bank / QR payment they've already made. */
export type PaymentRequestSource = 'STAFF' | 'PARENT';

/** Payment channel selected by a parent when submitting. Null for staff
 *  (always cash). */
export type ParentPaymentMethod = 'UPI' | 'BANK' | 'CASH' | 'OTHER';

export interface PaymentRequestProps {
  academyId: string;
  studentId: string;
  feeDueId: string;
  monthKey: string;
  amount: number;
  /** User id of the author: staff for 'STAFF' source, parent user id for 'PARENT'. */
  staffUserId: string;
  /** Author notes. Holds staff cash-collection comment OR parent submission message. */
  staffNotes: string;
  status: PaymentRequestStatus;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  /** 'STAFF' (cash in hand) or 'PARENT' (proof-of-payment). Defaults to 'STAFF'
   *  for back-compat with records created before this field existed. */
  source: PaymentRequestSource;
  /** Parent's payment channel (null for staff). */
  paymentMethod: ParentPaymentMethod | null;
  /** Uploaded screenshot URL (required for PARENT source). */
  proofImageUrl: string | null;
  /** Bank / UPI reference number the parent entered (required for PARENT). */
  paymentRefNumber: string | null;
  audit: AuditFields;
}

export class PaymentRequest extends Entity<PaymentRequestProps> {
  private constructor(id: UniqueId, props: PaymentRequestProps) {
    super(id, props);
  }

  static create(params: {
    id: string;
    academyId: string;
    studentId: string;
    feeDueId: string;
    monthKey: string;
    amount: number;
    staffUserId: string;
    staffNotes: string;
    source?: PaymentRequestSource;
    paymentMethod?: ParentPaymentMethod | null;
    proofImageUrl?: string | null;
    paymentRefNumber?: string | null;
  }): PaymentRequest {
    return new PaymentRequest(new UniqueId(params.id), {
      academyId: params.academyId,
      studentId: params.studentId,
      feeDueId: params.feeDueId,
      monthKey: params.monthKey,
      amount: params.amount,
      staffUserId: params.staffUserId,
      staffNotes: params.staffNotes,
      status: 'PENDING',
      reviewedByUserId: null,
      reviewedAt: null,
      rejectionReason: null,
      source: params.source ?? 'STAFF',
      paymentMethod: params.paymentMethod ?? null,
      proofImageUrl: params.proofImageUrl ?? null,
      paymentRefNumber: params.paymentRefNumber ?? null,
      audit: createAuditFields(),
    });
  }

  static reconstitute(id: string, props: PaymentRequestProps): PaymentRequest {
    return new PaymentRequest(new UniqueId(id), props);
  }

  get academyId(): string {
    return this.props.academyId;
  }

  get studentId(): string {
    return this.props.studentId;
  }

  get feeDueId(): string {
    return this.props.feeDueId;
  }

  get monthKey(): string {
    return this.props.monthKey;
  }

  get amount(): number {
    return this.props.amount;
  }

  get staffUserId(): string {
    return this.props.staffUserId;
  }

  get staffNotes(): string {
    return this.props.staffNotes;
  }

  get status(): PaymentRequestStatus {
    return this.props.status;
  }

  get reviewedByUserId(): string | null {
    return this.props.reviewedByUserId;
  }

  get reviewedAt(): Date | null {
    return this.props.reviewedAt;
  }

  get rejectionReason(): string | null {
    return this.props.rejectionReason;
  }

  get audit(): AuditFields {
    return this.props.audit;
  }

  get source(): PaymentRequestSource {
    return this.props.source;
  }

  get paymentMethod(): ParentPaymentMethod | null {
    return this.props.paymentMethod;
  }

  get proofImageUrl(): string | null {
    return this.props.proofImageUrl;
  }

  get paymentRefNumber(): string | null {
    return this.props.paymentRefNumber;
  }

  approve(reviewerId: string, reviewedAt: Date): PaymentRequest {
    return PaymentRequest.reconstitute(this.id.toString(), {
      ...this.props,
      status: 'APPROVED',
      reviewedByUserId: reviewerId,
      reviewedAt,
      audit: updateAuditFields(this.props.audit),
    });
  }

  reject(reviewerId: string, reviewedAt: Date, reason: string): PaymentRequest {
    return PaymentRequest.reconstitute(this.id.toString(), {
      ...this.props,
      status: 'REJECTED',
      reviewedByUserId: reviewerId,
      reviewedAt,
      rejectionReason: reason,
      audit: updateAuditFields(this.props.audit),
    });
  }

  cancel(): PaymentRequest {
    return PaymentRequest.reconstitute(this.id.toString(), {
      ...this.props,
      status: 'CANCELLED',
      audit: updateAuditFields(this.props.audit),
    });
  }

  updateNotes(notes: string): PaymentRequest {
    return PaymentRequest.reconstitute(this.id.toString(), {
      ...this.props,
      staffNotes: notes,
      audit: updateAuditFields(this.props.audit),
    });
  }

  /** Allow staff to resubmit a previously rejected request with updated notes/amount.
   *  Only allowed from REJECTED status to prevent resubmitting APPROVED/CANCELLED/PENDING requests. */
  resubmit(notes: string, amount?: number): PaymentRequest {
    if (this.props.status !== 'REJECTED') {
      throw new Error(
        `Cannot resubmit payment request ${this.id.toString()}: ` +
        `current status is ${this.props.status}, expected REJECTED`,
      );
    }

    return PaymentRequest.reconstitute(this.id.toString(), {
      ...this.props,
      status: 'PENDING',
      staffNotes: notes,
      amount: amount ?? this.props.amount,
      reviewedByUserId: null,
      reviewedAt: null,
      rejectionReason: null,
      audit: updateAuditFields(this.props.audit),
    });
  }
}
