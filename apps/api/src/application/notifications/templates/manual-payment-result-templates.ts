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

export interface ManualPaymentApprovedPush {
  title: string;
  body: string;
  data: {
    type: 'MANUAL_PAYMENT_APPROVED';
    academyId: string;
    paymentRequestId: string;
    studentId: string;
    monthKey: string;
  };
}

export interface ManualPaymentRejectedPush {
  title: string;
  body: string;
  data: {
    type: 'MANUAL_PAYMENT_REJECTED';
    academyId: string;
    paymentRequestId: string;
    studentId: string;
    /**
     * Mobile uses this to render the ChildDetail screen header without an
     * extra fetch — Phase B deep-link landing.
     */
    studentName: string;
    monthKey: string;
  };
}

export function buildManualPaymentApprovedPush(params: {
  studentName: string;
  monthKey: string;
  academyId: string;
  paymentRequestId: string;
  studentId: string;
}): ManualPaymentApprovedPush {
  return {
    title: 'Payment approved',
    body: `Your payment for ${params.studentName} (${formatMonthKey(params.monthKey)}) has been approved.`,
    data: {
      type: 'MANUAL_PAYMENT_APPROVED',
      academyId: params.academyId,
      paymentRequestId: params.paymentRequestId,
      studentId: params.studentId,
      monthKey: params.monthKey,
    },
  };
}

export function buildManualPaymentRejectedPush(params: {
  studentName: string;
  monthKey: string;
  academyId: string;
  paymentRequestId: string;
  studentId: string;
}): ManualPaymentRejectedPush {
  // Body intentionally omits the rejection reason — push body limits make
  // long reasons truncate badly. The parent sees the full reason in the
  // payment-history detail screen.
  return {
    title: 'Payment needs attention',
    body: `Your payment for ${params.studentName} (${formatMonthKey(params.monthKey)}) was not approved. Please re-submit.`,
    data: {
      type: 'MANUAL_PAYMENT_REJECTED',
      academyId: params.academyId,
      paymentRequestId: params.paymentRequestId,
      studentId: params.studentId,
      studentName: params.studentName,
      monthKey: params.monthKey,
    },
  };
}
