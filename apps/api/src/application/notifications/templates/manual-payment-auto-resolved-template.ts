const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatMonthKey(monthKey: string): string {
  const [year, mm] = monthKey.split('-');
  const idx = parseInt(mm ?? '0', 10) - 1;
  if (!year || idx < 0 || idx > 11) return monthKey;
  return `${MONTH_NAMES[idx]} ${year}`;
}

export interface ManualPaymentAutoResolvedPush {
  title: string;
  body: string;
  data: {
    type: 'MANUAL_PAYMENT_AUTO_RESOLVED';
    academyId: string;
    paymentRequestId: string;
    studentId: string;
    studentName: string;
    monthKey: string;
  };
}

/**
 * Sent when the owner records the fee payment directly (via mark-fee-paid)
 * while the parent had a pending manual payment request for the same fee.
 *
 * Wording intentionally avoids "rejected" framing — the parent's payment
 * WAS recorded, just through a different channel (e.g., owner confirmed by
 * phone, then tapped Mark Paid). The proof submission becomes informational.
 */
export function buildManualPaymentAutoResolvedPush(params: {
  studentName: string;
  monthKey: string;
  academyId: string;
  paymentRequestId: string;
  studentId: string;
}): ManualPaymentAutoResolvedPush {
  return {
    title: 'Payment confirmed',
    body: `Your payment for ${params.studentName} (${formatMonthKey(params.monthKey)}) has been confirmed by the academy.`,
    data: {
      type: 'MANUAL_PAYMENT_AUTO_RESOLVED',
      academyId: params.academyId,
      paymentRequestId: params.paymentRequestId,
      studentId: params.studentId,
      studentName: params.studentName,
      monthKey: params.monthKey,
    },
  };
}
