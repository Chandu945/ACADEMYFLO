import type { SubscriptionInfo } from '../../../domain/subscription/subscription.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import type { AccessTokenPort } from '../../auth/ports';
import type { SubscriptionApiPort } from '../ports';

export type GetMySubscriptionDeps = {
  subscriptionApi: SubscriptionApiPort;
  accessToken: AccessTokenPort;
};

export async function getMySubscriptionUseCase(
  deps: GetMySubscriptionDeps,
): Promise<Result<SubscriptionInfo, AppError>> {
  const token = deps.accessToken.get();
  if (!token) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'No access token' } };
  }

  return deps.subscriptionApi.getMySubscription(token);
}
