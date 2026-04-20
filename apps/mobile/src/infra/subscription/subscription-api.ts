import type { SubscriptionInfo } from '../../domain/subscription/subscription.types';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import { err, ok } from '../../domain/common/result';
import type { SubscriptionApiPort } from '../../application/subscription/ports';
import type {
  InitiatePaymentResponse,
  PaymentStatusResponse,
} from '../../domain/payments/cashfree.types';
import {
  initiatePaymentResponseSchema,
  paymentStatusResponseSchema,
  subscriptionInfoSchema,
} from '../../domain/payments/cashfree.schemas';
import { apiGet, apiPost } from '../http/api-client';
import type { z, ZodSchema } from 'zod';

// Runtime-validate API responses so a drifting backend contract surfaces as a
// clear VALIDATION error rather than a silent `undefined` field deep in the UI.
function validateResponse<T>(
  schema: ZodSchema<T>,
  result: Result<unknown, AppError>,
  label: string,
): Result<T, AppError> {
  if (!result.ok) return result;
  const parsed = schema.safeParse(result.value);
  if (!parsed.success) {
    if (__DEV__) {
      console.error(`[subscriptionApi] ${label} schema mismatch:`, parsed.error.issues);
    }
    return err({ code: 'UNKNOWN', message: 'Unexpected server response' });
  }
  return ok(parsed.data);
}

export const subscriptionApi: SubscriptionApiPort = {
  async getMySubscription(): Promise<Result<SubscriptionInfo, AppError>> {
    const result = await apiGet<unknown>('/api/v1/subscription/me');
    return validateResponse(
      subscriptionInfoSchema as unknown as ZodSchema<SubscriptionInfo>,
      result,
      'getMySubscription',
    );
  },

  async initiatePayment(): Promise<Result<InitiatePaymentResponse, AppError>> {
    const result = await apiPost<unknown>('/api/v1/subscription-payments/initiate');
    return validateResponse(
      initiatePaymentResponseSchema as unknown as ZodSchema<InitiatePaymentResponse>,
      result,
      'initiatePayment',
    );
  },

  async getPaymentStatus(
    orderId: string,
  ): Promise<Result<PaymentStatusResponse, AppError>> {
    const result = await apiGet<unknown>(
      `/api/v1/subscription-payments/${encodeURIComponent(orderId)}/status`,
    );
    return validateResponse(
      paymentStatusResponseSchema as unknown as ZodSchema<PaymentStatusResponse>,
      result,
      'getPaymentStatus',
    );
  },
};

// Re-export z to prevent unused-import complaints if we add more usage later.
export type { z };
