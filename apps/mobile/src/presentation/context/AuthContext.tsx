import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
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
import { accessTokenStore, getAccessToken, registerAuthFailureHandler } from '../../infra/http/api-client';
import { isTokenExpiredOrExpiring } from '../../infra/auth/token-expiry';
import { checkAppVersionUseCase } from '../../application/auth/use-cases/check-app-version.usecase';
import { clearAttendanceSummaryCache } from '../components/dashboard/AttendanceSummaryWidget';
import { clearMonthlyChartCache } from '../components/dashboard/MonthlyChartWidget';

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
    // Clear cached dashboard data to prevent cross-user data leak
    try { clearAttendanceSummaryCache(); } catch { /* ignore */ }
    try { clearMonthlyChartCache(); } catch { /* ignore */ }
    // Always transition to unauthenticated regardless of errors above
    if (mountedRef.current) {
      setState({ phase: 'unauthenticated', user: null, subscription: null, forceUpdate: null });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    registerAuthFailureHandler(() => {
      setState({ phase: 'unauthenticated', user: null, subscription: null, forceUpdate: null });
    });

    (async () => {
      // Check if app version meets minimum requirement
      const versionCheck = await checkAppVersionUseCase();
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
    };
  }, [resolvePhase]);

  // When app returns from background, silently re-refresh the access token
  // so the user is never forced to re-login after backgrounding
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      const token = getAccessToken();
      const needsRefresh = !token || isTokenExpiredOrExpiring(token);
      if (nextState === 'active' && state.phase === 'ready' && needsRefresh) {
        // Access token was lost or expired/expiring — silently restore
        restoreSessionUseCase(deps)
          .then(async (result) => {
            if (!mountedRef.current) return;
            if (!result.ok) {
              setState({ phase: 'unauthenticated', user: null, subscription: null, forceUpdate: null });
              return;
            }
            // Token is now refreshed in-memory via restoreSessionUseCase

            // After token refresh succeeds, also recheck subscription
            try {
              const subResult = await getMySubscriptionUseCase({ subscriptionApi });
              if (!mountedRef.current) return;
              if (subResult.ok && !subResult.value.canAccessApp) {
                setState(prev => ({ ...prev, phase: 'blocked' }));
              }
            } catch {
              // Best effort — don't block on subscription check failure
            }
          })
          .catch((err) => {
            if (__DEV__) console.warn(
              '[AuthContext] Background token refresh failed:',
              err instanceof Error ? err.message : 'unknown',
            );
            // Don't change phase — let the next API call trigger proper auth failure handling
            // But clear the stale access token so api-client will attempt refresh
            if (!mountedRef.current) return;
            accessTokenStore.set(null);
          });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [state.phase]);

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

  const value: AuthContextValue = {
    ...state,
    login,
    signup,
    setupAcademy,
    logout: doLogout,
    refreshSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
