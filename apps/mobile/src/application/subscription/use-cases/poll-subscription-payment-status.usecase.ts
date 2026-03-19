import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import type { PaymentStatusResponse } from '../../../domain/payments/cashfree.types';
import type { SubscriptionApiPort } from '../ports';

export type PollPaymentDeps = {
  subscriptionApi: SubscriptionApiPort;
};

export async function pollSubscriptionPaymentStatusUseCase(
  deps: PollPaymentDeps,
  orderId: string,
): Promise<Result<PaymentStatusResponse, AppError>> {
  return deps.subscriptionApi.getPaymentStatus(orderId);
}
