import type { PaymentRequestStatus } from '@academyflo/contracts';
export type { PaymentRequestStatus } from '@academyflo/contracts';

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
