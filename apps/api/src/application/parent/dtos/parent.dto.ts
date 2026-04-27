import type { FeeDueStatus, PaidSource, PaymentLabel } from '@academyflo/contracts';

export interface ChildSummaryDto {
  studentId: string;
  fullName: string;
  status: string;
  monthlyFee: number;
  academyId: string;
  currentMonthAttendancePercent: number | null;
  // The "fee to pay" surfaced to the parent. Semantics changed: this is the
  // OLDEST unpaid fee (DUE or UPCOMING), not strictly the current month.
  // Older dues take priority over newer ones — late fees apply correctly
  // and the backlog gets cleared in order.
  currentMonthFeeDueId: string | null;
  currentMonthFeeAmount: number | null;
  currentMonthFeeStatus: FeeDueStatus | null;
  /** monthKey of the fee surfaced above (e.g. "2026-03"), so the UI can
   *  render the right label instead of hardcoding the current calendar month. */
  currentMonthFeeMonthKey: string | null;
  /** Count of unpaid (UPCOMING + DUE) fees across all months for this student. */
  totalUnpaidMonths: number;
  /** Sum of unpaid amounts (incl. late fee) across all months. */
  totalUnpaidAmount: number;
}

export interface ParentProfileDto {
  fullName: string;
  email: string;
  phoneNumber: string;
}

export interface AcademyInfoDto {
  academyName: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
}

export interface PaymentHistoryItemDto {
  feeDueId: string;
  receiptNumber: string;
  studentName: string;
  monthKey: string;
  amount: number;
  source: PaidSource;
  paidAt: string;
}

export interface ChildBatchAttendanceBreakdown {
  batchId: string;
  batchName: string;
  presentCount: number;
  expectedCount: number;
  presentDates: string[];
  absentDates: string[];
}

export interface ChildAttendanceSummaryDto {
  studentId: string;
  month: string;
  /** Dates the child missed at least one scheduled session. */
  absentDates: string[];
  holidayDates: string[];
  /** Total session-attendances across all of the child's batches. */
  presentCount: number;
  /** expectedCount minus presentCount. Session-level. */
  absentCount: number;
  /** Sum across batches of scheduled-days-in-month minus holidays-on-scheduled-days. */
  expectedCount: number;
  holidayCount: number;
  perBatch: ChildBatchAttendanceBreakdown[];
}

export interface ChildFeeDueDto {
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
}

export interface InitiateFeePaymentOutput {
  orderId: string;
  paymentSessionId: string;
  baseAmount: number;
  lateFee: number;
  convenienceFee: number;
  totalAmount: number;
  currency: string;
}

export interface FeePaymentStatusOutput {
  orderId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  baseAmount: number;
  convenienceFee: number;
  totalAmount: number;
  providerPaymentId: string | null;
  paidAt: string | null;
}

export interface ReceiptOutput {
  receiptNumber: string;
  studentName: string;
  academyName: string;
  monthKey: string;
  amount: number;
  lateFeeApplied: number | null;
  paidAt: string;
  paymentMethod: string;
  source: PaidSource;
}
