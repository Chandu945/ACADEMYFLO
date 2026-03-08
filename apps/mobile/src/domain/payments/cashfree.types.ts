import type { TierKey } from '@playconnect/contracts';

export type PaymentFlowStatus = 'idle' | 'initiating' | 'checkout' | 'polling' | 'success' | 'failed';

export type InitiatePaymentResponse = {
  orderId: string;
  paymentSessionId: string;
  amountInr: number;
  currency: string;
  tierKey: TierKey;
  expiresAt: string;
};

export type PaymentStatusResponse = {
  orderId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  tierKey: TierKey;
  amountInr: number;
  providerPaymentId: string | null;
  paidAt: string | null;
  subscription: {
    status: string;
    paidStartAt: string | null;
    paidEndAt: string | null;
  };
};
