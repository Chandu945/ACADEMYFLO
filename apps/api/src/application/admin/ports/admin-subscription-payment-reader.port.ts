import type { Paginated } from '@academyflo/contracts';

export const ADMIN_SUBSCRIPTION_PAYMENT_READER = Symbol(
  'ADMIN_SUBSCRIPTION_PAYMENT_READER',
);

export type AdminSubscriptionPaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface AdminSubscriptionPaymentRecord {
  id: string;
  academyId: string;
  ownerUserId: string;
  orderId: string;
  cfOrderId: string | null;
  tierKey: string;
  amountInr: number;
  currency: string;
  activeStudentCountAtPurchase: number;
  status: AdminSubscriptionPaymentStatus;
  failureReason: string | null;
  paidAt: Date | null;
  providerPaymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminSubscriptionPaymentFilter {
  page: number;
  pageSize: number;
  academyId?: string;
  status?: AdminSubscriptionPaymentStatus;
  from?: string;
  to?: string;
  /**
   * "stuck" = PENDING for longer than `stuckThresholdMinutes` minutes.
   * Useful shorthand to surface payments where Cashfree never completed,
   * either because the user dropped or the webhook never arrived.
   */
  stuckThresholdMinutes?: number;
}

export interface AdminSubscriptionPaymentReader {
  listAll(
    filter: AdminSubscriptionPaymentFilter,
  ): Promise<Paginated<AdminSubscriptionPaymentRecord>>;
}
