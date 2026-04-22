import { z } from 'zod';

export type { FeeDueStatus, PaidSource, PaymentLabel } from '@academyflo/contracts';

export const childSummarySchema = z.object({
  studentId: z.string(),
  fullName: z.string(),
  status: z.string(),
  monthlyFee: z.number(),
  academyId: z.string(),
  currentMonthAttendancePercent: z.number().nullable(),
});

export const childrenListSchema = z.array(childSummarySchema);

export const childAttendanceSummarySchema = z.object({
  studentId: z.string(),
  month: z.string(),
  absentDates: z.array(z.string()),
  holidayDates: z.array(z.string()),
  presentCount: z.number(),
  absentCount: z.number(),
  holidayCount: z.number(),
});

export const childFeeDueSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  monthKey: z.string(),
  dueDate: z.string(),
  amount: z.number(),
  lateFee: z.number().nullable().transform((v) => v ?? 0),
  totalPayable: z.number().nullable().transform((v) => v ?? 0),
  status: z.enum(['UPCOMING', 'DUE', 'PAID']),
  paidAt: z.string().nullable(),
  paidSource: z.enum(['OWNER_DIRECT', 'STAFF_APPROVED', 'PARENT_ONLINE', 'MANUAL']).nullable(),
  paymentLabel: z.enum(['CASH', 'UPI', 'CARD', 'NET_BANKING', 'ONLINE']).nullable(),
});

export const childFeesListSchema = z.array(childFeeDueSchema);

export const initiateFeePaymentResponseSchema = z.object({
  orderId: z.string(),
  paymentSessionId: z.string(),
  baseAmount: z.number(),
  lateFee: z.number().default(0),
  convenienceFee: z.number(),
  totalAmount: z.number(),
  currency: z.string(),
});

export const feePaymentStatusResponseSchema = z.object({
  orderId: z.string(),
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED']),
  baseAmount: z.number(),
  convenienceFee: z.number(),
  totalAmount: z.number(),
  providerPaymentId: z.string().nullable(),
  paidAt: z.string().nullable(),
});

export const receiptSchema = z.object({
  receiptNumber: z.string(),
  studentName: z.string(),
  academyName: z.string(),
  monthKey: z.string(),
  amount: z.number(),
  lateFeeApplied: z.number().nullable().default(null),
  paidAt: z.string(),
  paymentMethod: z.string(),
  source: z.enum(['OWNER_DIRECT', 'STAFF_APPROVED', 'PARENT_ONLINE', 'MANUAL']),
});

export const parentProfileSchema = z.object({
  fullName: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  profilePhotoUrl: z.string().nullable().optional(),
});

export const academyInfoSchema = z.object({
  academyName: z.string(),
  address: z.object({
    line1: z.string(),
    line2: z.string().nullable().optional(),
    city: z.string(),
    state: z.string(),
    pincode: z.string(),
    country: z.string(),
  }),
});

export const paymentHistoryItemSchema = z.object({
  feeDueId: z.string(),
  receiptNumber: z.string(),
  studentName: z.string(),
  monthKey: z.string(),
  amount: z.number(),
  source: z.enum(['OWNER_DIRECT', 'STAFF_APPROVED', 'PARENT_ONLINE', 'MANUAL']),
  paidAt: z.string(),
});

export const paymentHistoryListSchema = z.array(paymentHistoryItemSchema);

/* ── Manual payment (Phase 2/3) ──────────────────────────────────────────── */

export const academyBankDetailsSchema = z.object({
  accountHolderName: z.string(),
  accountNumber: z.string(),
  ifscCode: z.string(),
  bankName: z.string(),
  branchName: z.string(),
});

export const academyPaymentMethodsSchema = z.object({
  manualPaymentsEnabled: z.boolean(),
  upiId: z.string().nullable(),
  upiHolderName: z.string().nullable(),
  qrCodeImageUrl: z.string().nullable(),
  bankDetails: academyBankDetailsSchema.nullable(),
  academyName: z.string(),
});

export const parentPaymentRequestSchema = z.object({
  id: z.string(),
  academyId: z.string(),
  studentId: z.string(),
  feeDueId: z.string(),
  monthKey: z.string(),
  amount: z.number(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
  source: z.enum(['STAFF', 'PARENT']),
  paymentMethod: z.enum(['UPI', 'BANK', 'CASH', 'OTHER']).nullable(),
  proofImageUrl: z.string().nullable(),
  paymentRefNumber: z.string().nullable(),
  staffNotes: z.string(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
