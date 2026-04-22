import type { PaymentRequestStatus } from '@academyflo/contracts';
export type { PaymentRequestStatus } from '@academyflo/contracts';

/** Who authored a payment request — staff recording cash collection, or a
 *  parent submitting proof of an out-of-band UPI / bank transfer. */
export type PaymentRequestSource = 'STAFF' | 'PARENT';

/** Channel a parent picked when submitting. Null for staff (always cash). */
export type PaymentRequestMethod = 'UPI' | 'BANK' | 'CASH' | 'OTHER';

export type PaymentRequestItem = {
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
  // Phase 4 — parent submission extensions. 'STAFF' source keeps the other
  // three null on legacy / staff-sourced records.
  source: PaymentRequestSource;
  paymentMethod: PaymentRequestMethod | null;
  proofImageUrl: string | null;
  paymentRefNumber: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePaymentRequestInput = {
  studentId: string;
  monthKey: string;
  staffNotes: string;
};

export type EditPaymentRequestInput = {
  staffNotes: string;
};

export type RejectPaymentRequestInput = {
  reason: string;
};
