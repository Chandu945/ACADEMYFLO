import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import type { AuthUser, AcademySetupRequest } from '../../domain/auth/auth.types';
import type { SubscriptionInfo } from '../../domain/subscription/subscription.types';
import type { AppError } from '../../domain/common/errors';
import type { SignupInput } from '../../application/auth/use-cases/owner-signup.usecase';
import { loginUseCase } from '../../application/auth/use-cases/login.usecase';
import { ownerSignupUseCase } from '../../application/auth/use-cases/owner-signup.usecase';
import { setupAcademyUseCase } from '../../application/auth/use-cases/setup-academy.usecase';
import { restoreSessionUseCase } from '../../application/auth/use-cases/restore-session.usecase';
import { logoutUseCase } from '../../application/auth/use-cases/logout.usecase';
import { getMySubscriptionUseCase } from '../../application/subscription/use-cases/get-my-subscription.usecase';
import { authApi } from '../../infra/auth/auth-api';
import { tokenStore } from '../../infra/auth/token-store';
import { deviceIdStore } from '../../infra/auth/device-id';
import { subscriptionApi } from '../../infra/subscription/subscription-api';
import { pushTokenApi } from '../../infra/notification/push-token-api';
import { accessTokenStore, getAccessToken, registerAuthFailureHandler, tryRefresh } from '../../infra/http/api-client';
import { getFcmToken } from '../../infra/notification/firebase-messaging';
import { isTokenExpiredOrExpiring } from '../../infra/auth/token-expiry';
import { checkAppVersionUseCase } from '../../application/auth/use-cases/check-app-version.usecase';
import { APP_VERSION, APP_PLATFORM } from '../../infra/app-version';
import { env } from '../../infra/env';
import { clearAttendanceSummaryCache } from '../components/dashboard/AttendanceSummaryWidget';
import { clearMonthlyChartCache } from '../components/dashboard/MonthlyChartWidget';
import { invalidateBatchCache } from '../../infra/batch/batch-cache';

export type AuthPhase =
  | 'initializing'
  | 'updateRequired'
  | 'unauthenticated'
  | 'needsAcademySetup'
  | 'blocked'
  | 'ready';

export type ForceUpdateInfo = {
  storeUrl: string;
  minVersion: string;
};

export type AuthState = {
  phase: AuthPhase;
  user: AuthUser | null;
  subscription: SubscriptionInfo | null;
  forceUpdate: ForceUpdateInfo | null;
};

type AuthActions = {
  login: (identifier: string, password: string) => Promise<AppError | null>;
  signup: (input: SignupInput) => Promise<AppError | null>;
  setupAcademy: (input: AcademySetupRequest) => Promise<AppError | null>;
  logout: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
};

export type AuthContextValue = AuthState & AuthActions;

const defaultContext: AuthContextValue = {
  phase: 'initializing',
  user: null,
  subscription: null,
  forceUpdate: null,
  login: async () => ({ code: 'UNKNOWN', message: 'Not ready' }),
  signup: async () => ({ code: 'UNKNOWN', message: 'Not ready' }),
  setupAcademy: async () => ({ code: 'UNKNOWN', message: 'Not ready' }),
  logout: async () => {},
  refreshSubscription: async () => {},
};

export const AuthContext = createContext<AuthContextValue>(defaultContext);

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

// Module-scope singletons — acceptable because these are stateless adapters.
// For testability, inject via AuthProvider props in test harness.
const deps = {
  authApi,
  tokenStore,
  deviceId: deviceIdStore,
  accessToken: accessTokenStore,
  pushTokenApi,
  tokenRefresher: { tryRefresh },
  pushTokenProvider: { getCurrentToken: getFcmToken },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    phase: 'initializing',
    user: null,
    subscription: null,
    forceUpdate: null,
  });
  const mountedRef = useRef(true);

  // Deps are empty: mountedRef/setState are stable; subscriptionApi is a module-scope singleton.
  const resolvePhase = useCallback(async (user: AuthUser): Promise<void> => {
    // Parents skip subscription check — go directly to ready
    if (user.role === 'PARENT') {
      if (mountedRef.current) {
        setState({ phase: 'ready', user, subscription: null, forceUpdate: null });
      }
      return;
    }

    const subResult = await getMySubscriptionUseCase({
      subscriptionApi,
    });

    if (!mountedRef.current) return;

    if (!subResult.ok) {
      if (subResult.error.code === 'CONFLICT') {
        setState({ phase: 'needsAcademySetup', user, subscription: null, forceUpdate: null });
      } else if (subResult.error.code === 'UNAUTHORIZED' || subResult.error.code === 'FORBIDDEN') {
        setState({ phase: 'unauthenticated', user: null, subscription: null, forceUpdate: null });
      } else {
        // Transient error — let user proceed, subscription will be rechecked later
        setState({ phase: 'ready', user, subscription: null, forceUpdate: null });
      }
      return;
    }

    const sub = subResult.value;
    if (!sub.canAccessApp) {
      setState({ phase: 'blocked', user, subscription: sub, forceUpdate: null });
    } else {
      setState({ phase: 'ready', user, subscription: sub, forceUpdate: null });
    }
  }, []);

  const doLogout = useCallback(async () => {
    try {
      await logoutUseCase(deps);
    } catch (e) {
      if (__DEV__) console.warn('[AuthContext] Logout use case failed (proceeding anyway):', e);
    }
    // Clear cached dashboard data to prevent cross-user data leak. Batch
    // list was previously missed — next tenant's BatchMultiSelect would
    // briefly render the prior tenant's batch names.
    clearAttendanceSummaryCache();
    clearMonthlyChartCache();
    invalidateBatchCache();
    // Always transition to unauthenticated regardless of errors above
    if (mountedRef.current) {
      setState({ phase: 'unauthenticated', user: null, subscription: null, forceUpdate: null });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const unregisterAuthFailure = registerAuthFailureHandler(() => {
      if (mountedRef.current) {
        setState({ phase: 'unauthenticated', user: null, subscription: null, forceUpdate: null });
      }
    });

    (async () => {
      // Check if app version meets minimum requirement
      const versionCheck = await checkAppVersionUseCase({
        apiBaseUrl: env.API_BASE_URL,
        appVersion: APP_VERSION,
        platform: APP_PLATFORM,
      });
      if (!mountedRef.current) return;
      if (versionCheck?.updateRequired) {
        setState({
          phase: 'updateRequired',
          user: null,
          subscription: null,
          forceUpdate: { storeUrl: versionCheck.storeUrl, minVersion: versionCheck.minVersion },
        });
        return;
      }

      const result = await restoreSessionUseCase(deps);
      if (!mountedRef.current) return;

      if (!result.ok) {
        setState({ phase: 'unauthenticated', user: null, subscription: null, forceUpdate: null });
        return;
      }

      await resolvePhase(result.value.user);
    })().catch(() => {
      if (mountedRef.current) {
        setState({ phase: 'unauthenticated', user: null, subscription: null, forceUpdate: null });
      }
    });

    return () => {
      mountedRef.current = false;
      unregisterAuthFailure();
    };
  }, [resolvePhase]);

  // When the app returns from background: (a) silently refresh the access
  // token so the user isn't forced to re-login, and (b) re-evaluate
  // subscription so a mid-session flip (owner paid, admin deactivated, trial
  // expired) flows the user into the right navigation stack both directions.
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState !== 'active') return;
      if (!mountedRef.current) return;

      const token = getAccessToken();
      const needsTokenRefresh = !token || isTokenExpiredOrExpiring(token);
      const isSubscriptionSensitivePhase =
        state.phase === 'ready' || state.phase === 'blocked';

      if (state.phase === 'ready' && needsTokenRefresh) {
        // Access token was lost or expired/expiring — silently restore then
        // resolve phase (which does the full subscription recheck).
        restoreSessionUseCase(deps)
          .then(async (result) => {
            if (!mountedRef.current) return;
            if (!result.ok) {
              setState({ phase: 'unauthenticated', user: null, subscription: null, forceUpdate: null });
              return;
            }
            if (state.user) {
              // Canonical phase resolution — correctly handles both
              // ready→blocked (sub expired) and blocked→ready (admin reactivated).
              await resolvePhase(state.user);
            }
          })
          .catch(async (err) => {
            if (__DEV__) console.warn(
              '[AuthContext] Background token refresh failed:',
              err instanceof Error ? err.message : 'unknown',
            );
            if (!mountedRef.current) return;
            // If the stored session was already cleared (permanent auth failure),
            // transition to unauthenticated immediately instead of waiting for the next API call
            const session = await tokenStore.getSession();
            if (!session) {
              setState({ phase: 'unauthenticated', user: null, subscription: null, forceUpdate: null });
            } else {
              accessTokenStore.set(null);
            }
          });
      } else if (isSubscriptionSensitivePhase && state.user) {
        // Token still fresh but we may have missed a subscription flip
        // while the app was backgrounded. Re-resolve cheaply.
        resolvePhase(state.user).catch(() => { /* best-effort */ });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [state.phase, state.user, resolvePhase]);

  const login = useCallback(
    async (identifier: string, password: string): Promise<AppError | null> => {
      const result = await loginUseCase(identifier, password, deps);
      if (!result.ok) return result.error;
      await resolvePhase(result.value.user);
      return null;
    },
    [resolvePhase],
  );

  const signup = useCallback(async (input: SignupInput): Promise<AppError | null> => {
    const result = await ownerSignupUseCase(input, deps);
    if (!result.ok) return result.error;
    setState({ phase: 'needsAcademySetup', user: result.value.user, subscription: null, forceUpdate: null });
    return null;
  }, []);

  const setupAcademy = useCallback(
    async (input: AcademySetupRequest): Promise<AppError | null> => {
      const result = await setupAcademyUseCase(input, {
        authApi,
        accessToken: accessTokenStore,
      });
      if (!result.ok) return result.error;
      if (state.user) {
        await resolvePhase(state.user);
      }
      return null;
    },
    [state.user, resolvePhase],
  );

  const refreshSubscription = useCallback(async () => {
    if (!state.user) return;
    await resolvePhase(state.user);
  }, [state.user, resolvePhase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      signup,
      setupAcademy,
      logout: doLogout,
      refreshSubscription,
    }),
    [state, login, signup, setupAcademy, doLogout, refreshSubscription],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
