import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import { err } from '../../../domain/common/result';
import type { InitiatePaymentResponse } from '../../../domain/payments/cashfree.types';
import type { SubscriptionApiPort } from '../ports';

export type InitiatePaymentDeps = {
  subscriptionApi: SubscriptionApiPort;
  accessToken: { get: () => string | null };
};

export async function initiateSubscriptionPaymentUseCase(
  deps: InitiatePaymentDeps,
): Promise<Result<InitiatePaymentResponse, AppError>> {
  const token = deps.accessToken.get();
  if (!token) {
    return err({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  return deps.subscriptionApi.initiatePayment(token);
}
