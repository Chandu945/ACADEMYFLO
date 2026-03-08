import type { SubscriptionInfo } from '../../domain/subscription/subscription.types';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import type {
  InitiatePaymentResponse,
  PaymentStatusResponse,
} from '../../domain/payments/cashfree.types';

export interface SubscriptionApiPort {
  getMySubscription(accessToken: string): Promise<Result<SubscriptionInfo, AppError>>;
  initiatePayment(accessToken: string): Promise<Result<InitiatePaymentResponse, AppError>>;
  getPaymentStatus(accessToken: string, orderId: string): Promise<Result<PaymentStatusResponse, AppError>>;
}
