/** Fee due lifecycle statuses */
export type FeeDueStatus = 'UPCOMING' | 'DUE' | 'PAID';

export const FEE_DUE_STATUSES = ['UPCOMING', 'DUE', 'PAID'] as const;

/** How the payment was initiated */
export type PaidSource = 'OWNER_DIRECT' | 'STAFF_APPROVED' | 'PARENT_ONLINE';

/** Payment instrument label */
export type PaymentLabel = 'CASH' | 'UPI' | 'CARD' | 'NET_BANKING' | 'ONLINE';

/** Default due-date day of month (1-28) */
export const DEFAULT_DUE_DATE_DAY = 5;

/** Default receipt prefix */
export const DEFAULT_RECEIPT_PREFIX = 'PC';
