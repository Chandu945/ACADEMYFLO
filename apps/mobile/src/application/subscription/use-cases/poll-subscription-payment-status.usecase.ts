import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { err } from '../../../domain/common/result';
import type { PaymentStatusResponse } from '../../../domain/payments/cashfree.types';
import type { SubscriptionApiPort } from '../ports';

export type PollPaymentDeps = {
  subscriptionApi: SubscriptionApiPort;
  accessToken: { get: () => string | null };
};

export async function pollSubscriptionPaymentStatusUseCase(
  deps: PollPaymentDeps,
  orderId: string,
): Promise<Result<PaymentStatusResponse, AppError>> {
  const token = deps.accessToken.get();
  if (!token) {
    return err({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  return deps.subscriptionApi.getPaymentStatus(token, orderId);
}
