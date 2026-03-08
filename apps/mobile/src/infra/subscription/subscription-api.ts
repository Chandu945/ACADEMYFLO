import type { SubscriptionInfo } from '../../domain/subscription/subscription.types';
import type { AppError } from '../../domain/common/errors';
import type { Result } from '../../domain/common/result';
import type { SubscriptionApiPort } from '../../application/subscription/ports';
import type {
  InitiatePaymentResponse,
  PaymentStatusResponse,
} from '../../domain/payments/cashfree.types';
import { ok, err } from '../../domain/common/result';
import { mapHttpError } from '../http/error-mapper';
import { env } from '../env';

async function fetchApi<T>(
  method: string,
  path: string,
  accessToken: string,
): Promise<Result<T, AppError>> {
  const url = `${env.API_BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      return err(mapHttpError(res.status, json));
    }

    const json = (await res.json()) as { data: T };
    return ok(json.data);
  } catch {
    return err({ code: 'NETWORK', message: 'Network error. Please check your connection.' });
  }
}

async function postApi<T>(
  path: string,
  accessToken: string,
): Promise<Result<T, AppError>> {
  const url = `${env.API_BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      return err(mapHttpError(res.status, json));
    }

    const json = (await res.json()) as { data: T };
    return ok(json.data);
  } catch {
    return err({ code: 'NETWORK', message: 'Network error. Please check your connection.' });
  }
}

export const subscriptionApi: SubscriptionApiPort = {
  async getMySubscription(accessToken: string): Promise<Result<SubscriptionInfo, AppError>> {
    return fetchApi<SubscriptionInfo>('GET', '/api/v1/subscription/me', accessToken);
  },

  async initiatePayment(accessToken: string): Promise<Result<InitiatePaymentResponse, AppError>> {
    return postApi<InitiatePaymentResponse>('/api/v1/subscription-payments/initiate', accessToken);
  },

  async getPaymentStatus(
    accessToken: string,
    orderId: string,
  ): Promise<Result<PaymentStatusResponse, AppError>> {
    return fetchApi<PaymentStatusResponse>(
      'GET',
      `/api/v1/subscription-payments/${encodeURIComponent(orderId)}/status`,
      accessToken,
    );
  },
};
