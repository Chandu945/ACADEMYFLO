import type { SubscriptionInfo } from '../../../domain/subscription/subscription.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import type { SubscriptionApiPort } from '../ports';

export type GetMySubscriptionDeps = {
  subscriptionApi: SubscriptionApiPort;
};

export async function getMySubscriptionUseCase(
  deps: GetMySubscriptionDeps,
): Promise<Result<SubscriptionInfo, AppError>> {
  return deps.subscriptionApi.getMySubscription();
}
