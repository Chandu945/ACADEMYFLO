import type { SubscriptionInfo } from '../../domain/subscription/subscription.types';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import type { SubscriptionApiPort } from '../../application/subscription/ports';
import type {
  InitiatePaymentResponse,
  PaymentStatusResponse,
} from '../../domain/payments/cashfree.types';
import { apiGet, apiPost } from '../http/api-client';

export const subscriptionApi: SubscriptionApiPort = {
  async getMySubscription(): Promise<Result<SubscriptionInfo, AppError>> {
    return apiGet<SubscriptionInfo>('/api/v1/subscription/me');
  },

  async initiatePayment(): Promise<Result<InitiatePaymentResponse, AppError>> {
    return apiPost<InitiatePaymentResponse>('/api/v1/subscription-payments/initiate');
  },

  async getPaymentStatus(
    orderId: string,
  ): Promise<Result<PaymentStatusResponse, AppError>> {
    return apiGet<PaymentStatusResponse>(
      `/api/v1/subscription-payments/${encodeURIComponent(orderId)}/status`,
    );
  },
};
