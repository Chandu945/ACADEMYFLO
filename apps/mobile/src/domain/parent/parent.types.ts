import type { FeeDueStatus, PaidSource, PaymentLabel } from './parent.schemas';

export type ChildSummary = {
  studentId: string;
  fullName: string;
  status: string;
  monthlyFee: number;
  academyId: string;
  currentMonthAttendancePercent: number | null;
  currentMonthFeeDueId: string | null;
  currentMonthFeeAmount: number | null;
  currentMonthFeeStatus: FeeDueStatus | null;
  currentMonthFeeMonthKey: string | null;
  totalUnpaidMonths: number;
  totalUnpaidAmount: number;
};

export type ChildBatchAttendanceBreakdown = {
  batchId: string;
  batchName: string;
  presentCount: number;
  expectedCount: number;
  presentDates: string[];
  absentDates: string[];
};

export type ChildAttendanceSummary = {
  studentId: string;
  month: string;
  absentDates: string[];
  holidayDates: string[];
  /** Session-level (kept for backward compat). */
  presentCount: number;
  absentCount: number;
  holidayCount: number;
  expectedCount: number;
  /** Day-level metrics — optional because deployed API may not yet return them. */
  expectedDays?: number;
  presentDays?: number;
  absentDays?: number;
  partialDays?: number;
  perBatch: ChildBatchAttendanceBreakdown[];
};

export type ChildFeeDue = {
  id: string;
  studentId: string;
  monthKey: string;
  dueDate: string;
  amount: number;
  lateFee: number;
  totalPayable: number;
  status: FeeDueStatus;
  paidAt: string | null;
  paidSource: PaidSource | null;
  paymentLabel: PaymentLabel | null;
  /**
   * Open manual-payment request on this fee. `source` distinguishes a
   * parent-submitted proof from a staff-recorded cash collection so the UI
   * copy can match: "Owner approving your payment" vs "Recorded by Academy
   * staff" (G4 mobile-alignment fix). Pre-fix both surfaced as the same
   * generic pending badge — confusing when the parent hadn't submitted
   * anything but staff had recorded a cash collection.
   */
  pendingRequest: {
    id: string;
    amount: number;
    createdAt: string;
    source: 'PARENT' | 'STAFF';
  } | null;
};

export type FeePaymentFlowStatus =
  | 'idle'
  | 'initiating'
  | 'checkout'
  | 'polling'
  | 'success'
  | 'failed';

export type InitiateFeePaymentResponse = {
  orderId: string;
  paymentSessionId: string;
  baseAmount: number;
  lateFee: number;
  convenienceFee: number;
  totalAmount: number;
  currency: string;
};

export type FeePaymentStatusResponse = {
  orderId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  baseAmount: number;
  convenienceFee: number;
  totalAmount: number;
  providerPaymentId: string | null;
  paidAt: string | null;
};

export type ReceiptInfo = {
  receiptNumber: string;
  studentName: string;
  academyName: string;
  monthKey: string;
  amount: number;
  lateFeeApplied: number | null;
  paidAt: string;
  paymentMethod: string;
  source: PaidSource;
};

export type ParentProfile = {
  fullName: string;
  email: string;
  phoneNumber: string;
  profilePhotoUrl?: string | null;
};

export type UpdateProfileRequest = {
  fullName?: string;
  phoneNumber?: string;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type AcademyInfo = {
  academyName: string;
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
};

export type PaymentHistoryItem = {
  feeDueId: string;
  receiptNumber: string;
  studentName: string;
  monthKey: string;
  amount: number;
  source: PaidSource;
  paidAt: string;
};

/* ── Manual payment (Phase 2/3) ──────────────────────────────────────────── */

export type AcademyBankDetails = {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
};

export type AcademyPaymentMethods = {
  manualPaymentsEnabled: boolean;
  upiId: string | null;
  upiHolderName: string | null;
  qrCodeImageUrl: string | null;
  bankDetails: AcademyBankDetails | null;
  academyName: string;
};

export type ParentPaymentMethod = 'UPI' | 'BANK' | 'CASH' | 'OTHER';
export type ParentPaymentRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type ParentPaymentRequest = {
  id: string;
  academyId: string;
  studentId: string;
  feeDueId: string;
  monthKey: string;
  amount: number;
  status: ParentPaymentRequestStatus;
  source: 'STAFF' | 'PARENT';
  paymentMethod: ParentPaymentMethod | null;
  proofImageUrl: string | null;
  paymentRefNumber: string | null;
  staffNotes: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Returned by the pre-flight pending-request endpoint. Tells the parent's
 *  payment screen whether a payment for the same fee is already in flight
 *  (and who put it there) so the parent doesn't waste time uploading a
 *  duplicate UPI screenshot. */
export type PendingPaymentRequestForParent = {
  id: string;
  source: 'STAFF' | 'PARENT';
  amount: number;
  submittedAt: string;
  /** Display label — staff full name, "You", or "Family member". */
  submittedBy: string;
  paymentMethod: ParentPaymentMethod | null;
  proofImageUrl: string | null;
};

export type SubmitManualPaymentRequestInput = {
  studentId: string;
  feeDueId: string;
  amount: number;
  paymentMethod: ParentPaymentMethod;
  paymentRefNumber?: string;
  parentNote?: string;
  /** Local image URI (from react-native-image-picker) */
  proofImageUri: string;
  proofImageFileName: string;
  proofImageMimeType: string;
};
