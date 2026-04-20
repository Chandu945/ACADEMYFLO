import type { TierKey } from '@academyflo/contracts';
import type { SubscriptionPaymentStatus } from '@domain/subscription-payments/entities/subscription-payment.entity';
import type { SubscriptionStatus } from '@academyflo/contracts';

export interface InitiatePaymentOutput {
  orderId: string;
  paymentSessionId: string;
  amountInr: number;
  currency: string;
  tierKey: TierKey;
  expiresAt: string;
}

export interface PaymentStatusOutput {
  orderId: string;
  status: SubscriptionPaymentStatus;
  tierKey: TierKey;
  amountInr: number;
  providerPaymentId: string | null;
  paidAt: string | null;
  subscription: {
    status: SubscriptionStatus;
    paidStartAt: string | null;
    paidEndAt: string | null;
  };
}
