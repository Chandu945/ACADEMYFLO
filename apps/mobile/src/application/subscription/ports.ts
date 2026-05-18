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
  /**
   * User-initiated cancel of a PENDING payment. Tells the server to mark it
   * FAILED('USER_CANCELLED') so SubscriptionScreen's auto-resume doesn't
   * re-trap the user on the polling modal next visit. Server is idempotent
   * (already FAILED → no-op, already SUCCESS → preserved).
   */
  cancelPayment(orderId: string): Promise<Result<{ orderId: string; status: string }, AppError>>;
}
