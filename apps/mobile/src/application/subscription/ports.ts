import type { SubscriptionInfo } from '../../domain/subscription/subscription.types';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import type {
  InitiatePaymentResponse,
  PaymentStatusResponse,
} from '../../domain/payments/cashfree.types';

export interface SubscriptionApiPort {
  getMySubscription(): Promise<Result<SubscriptionInfo, AppError>>;
  initiatePayment(): Promise<Result<InitiatePaymentResponse, AppError>>;
  getPaymentStatus(orderId: string): Promise<Result<PaymentStatusResponse, AppError>>;
}
