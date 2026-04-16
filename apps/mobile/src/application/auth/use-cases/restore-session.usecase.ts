import type { AuthUser } from '../../../domain/auth/auth.types';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import type { TokenStorePort, AccessTokenPort, TokenRefresherPort } from '../ports';

export type RestoreResult = { user: AuthUser; accessToken: string };

export type RestoreSessionDeps = {
  tokenStore: TokenStorePort;
  accessToken: AccessTokenPort;
  tokenRefresher: TokenRefresherPort;
};

export async function restoreSessionUseCase(
  deps: RestoreSessionDeps,
): Promise<Result<RestoreResult, AppError>> {
  const session = await deps.tokenStore.getSession();
  if (!session) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'No stored session' } };
  }

  const newToken = await deps.tokenRefresher.tryRefresh();

  if (!newToken) {
    await deps.tokenStore.clearSession();
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Session expired' } };
  }

  // Check if user account is still active
  if (session.user.status === 'INACTIVE') {
    await deps.tokenStore.clearSession();
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Account is inactive' } };
  }

  // TODO: Periodically fetch the user profile after refresh to keep session.user up-to-date.
  // The refresh response does not include updated user data, so the stored user may become stale.

  return {
    ok: true,
    value: { user: session.user, accessToken: newToken },
  };
}
