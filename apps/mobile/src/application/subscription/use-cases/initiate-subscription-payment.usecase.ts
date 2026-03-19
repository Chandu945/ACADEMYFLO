import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import type { InitiatePaymentResponse } from '../../../domain/payments/cashfree.types';
import type { SubscriptionApiPort } from '../ports';

export type InitiatePaymentDeps = {
  subscriptionApi: SubscriptionApiPort;
};

export async function initiateSubscriptionPaymentUseCase(
  deps: InitiatePaymentDeps,
): Promise<Result<InitiatePaymentResponse, AppError>> {
  return deps.subscriptionApi.initiatePayment();
}
