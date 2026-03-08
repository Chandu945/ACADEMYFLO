import type { SubscriptionPayment } from '../entities/subscription-payment.entity';

export const SUBSCRIPTION_PAYMENT_REPOSITORY = Symbol('SUBSCRIPTION_PAYMENT_REPOSITORY');

export interface SubscriptionPaymentRepository {
  save(payment: SubscriptionPayment): Promise<void>;
  findByOrderId(orderId: string): Promise<SubscriptionPayment | null>;
  findPendingByAcademyId(academyId: string): Promise<SubscriptionPayment | null>;
}
