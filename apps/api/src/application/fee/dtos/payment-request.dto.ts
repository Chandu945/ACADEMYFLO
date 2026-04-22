import type { PaymentRequest } from '@domain/fee/entities/payment-request.entity';
import type {
  PaymentRequestSource,
  ParentPaymentMethod,
} from '@domain/fee/entities/payment-request.entity';
import type { PaymentRequestStatus } from '@academyflo/contracts';

export interface PaymentRequestDto {
  id: string;
  academyId: string;
  studentId: string;
  studentName: string | null;
  feeDueId: string;
  monthKey: string;
  amount: number;
  staffUserId: string;
  staffName: string | null;
  staffNotes: string;
  status: PaymentRequestStatus;
  reviewedByUserId: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  // Phase 2 — parent-submission fields. 'STAFF' source keeps method/proof/ref null.
  source: PaymentRequestSource;
  paymentMethod: ParentPaymentMethod | null;
  proofImageUrl: string | null;
  paymentRefNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRequestDtoNames {
  staffName?: string | null;
  studentName?: string | null;
  reviewedByName?: string | null;
}

export function toPaymentRequestDto(
  pr: PaymentRequest,
  names?: PaymentRequestDtoNames,
): PaymentRequestDto {
  return {
    id: pr.id.toString(),
    academyId: pr.academyId,
    studentId: pr.studentId,
    studentName: names?.studentName ?? null,
    feeDueId: pr.feeDueId,
    monthKey: pr.monthKey,
    amount: pr.amount,
    staffUserId: pr.staffUserId,
    staffName: names?.staffName ?? null,
    staffNotes: pr.staffNotes,
    status: pr.status,
    reviewedByUserId: pr.reviewedByUserId,
    reviewedByName: names?.reviewedByName ?? null,
    reviewedAt: pr.reviewedAt ? pr.reviewedAt.toISOString() : null,
    rejectionReason: pr.rejectionReason,
    source: pr.source,
    paymentMethod: pr.paymentMethod,
    proofImageUrl: pr.proofImageUrl,
    paymentRefNumber: pr.paymentRefNumber,
    createdAt: pr.audit.createdAt.toISOString(),
    updatedAt: pr.audit.updatedAt.toISOString(),
  };
}
