import React, { createContext, useContext, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { navigateFromOutside } from '../navigation/navigation-ref';
import {
  requestNotificationPermission,
  getFcmToken,
  onTokenRefresh,
  onForegroundMessage,
  onNotificationOpenedApp,
  getInitialNotification,
} from '../../infra/notification/firebase-messaging';
import { pushTokenApi } from '../../infra/notification/push-token-api';
import { registerPushTokenUseCase } from '../../application/notification/use-cases/register-push-token.usecase';
import type { RemoteNotification, NotificationType } from '../../domain/notification/notification.types';
import type { UserRole } from '@academyflo/contracts';

// Map notification type → top-level tab route name per role. The backend may
// also include data.route to override this (string route name plus optional
// data.* params); when present that takes precedence. This keeps the
// frontend resilient to backend route changes without a coordinated release.
const ROUTE_BY_TYPE: Record<NotificationType, Partial<Record<UserRole, string>>> = {
  FEE_REMINDER: {
    PARENT: 'Children',
    OWNER: 'Fees',
    STAFF: 'Fees',
  },
  PAYMENT_UPDATE: {
    PARENT: 'Payments',
    OWNER: 'Fees',
    STAFF: 'Fees',
  },
  ATTENDANCE_ALERT: {
    PARENT: 'Children',
    OWNER: 'Attendance',
    STAFF: 'Attendance',
  },
  ANNOUNCEMENT: {
    PARENT: 'More',
    OWNER: 'More',
    STAFF: 'More',
  },
  SYSTEM: {
    PARENT: 'More',
    OWNER: 'More',
    STAFF: 'More',
  },
};

function resolveNotificationRoute(
  notification: RemoteNotification,
  role: UserRole | undefined,
): { name: string; params?: Record<string, string> } | null {
  if (!role) return null;
  const data = notification.data ?? {};
  const dataRoute = data['route'];
  // Backend-supplied route wins. We only accept it if it's a string — never a
  // user-controlled URL or arbitrary object — to keep the surface small.
  if (typeof dataRoute === 'string' && dataRoute.length > 0 && dataRoute.length < 64) {
    const { route: _omit, ...rest } = data;
    return { name: dataRoute, params: rest };
  }
  const fallback = ROUTE_BY_TYPE[notification.type]?.[role];
  return fallback ? { name: fallback, params: data } : null;
}

type NotificationContextValue = {
  requestPermission: () => Promise<boolean>;
};

const defaultValue: NotificationContextValue = {
  requestPermission: async () => false,
};

const NotificationContext = createContext<NotificationContextValue>(defaultValue);

export function useNotifications(): NotificationContextValue {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { phase, user } = useAuth();
  const { showToast } = useToast();
  const registeredTokenRef = useRef<string | null>(null);
  // Track a per-token backoff so onTokenRefresh callbacks and mount-time
  // registrations don't race each other into an amplification loop on a
  // flaky network. Retries are capped; we don't re-attempt indefinitely.
  const retryStateRef = useRef<{ token: string; nextAttemptAt: number; attempts: number } | null>(
    null,
  );
  const RETRY_BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 32000];
  const MAX_REGISTRATION_ATTEMPTS = RETRY_BACKOFF_MS.length;

  const registerToken = useCallback(async (token: string) => {
    if (registeredTokenRef.current === token) return;
    const now = Date.now();
    const retryState = retryStateRef.current;
    if (retryState && retryState.token === token) {
      if (retryState.attempts >= MAX_REGISTRATION_ATTEMPTS) {
        if (__DEV__) console.warn('[notifications] registration gave up after max attempts');
        return;
      }
      if (now < retryState.nextAttemptAt) return;
    }

    const result = await registerPushTokenUseCase(token, { pushTokenApi });
    if (result.ok) {
      registeredTokenRef.current = token;
      retryStateRef.current = null;
      return;
    }

    const attempts = retryState?.token === token ? retryState.attempts + 1 : 1;
    const backoff =
      result.error.code === 'RATE_LIMITED' && result.error.retryAfterSeconds != null
        ? result.error.retryAfterSeconds * 1000
        : RETRY_BACKOFF_MS[Math.min(attempts - 1, RETRY_BACKOFF_MS.length - 1)]!;
    retryStateRef.current = { token, nextAttemptAt: now + backoff, attempts };

    if (__DEV__) {
      console.warn(
        `[notifications] push token registration failed (attempt ${attempts}/${MAX_REGISTRATION_ATTEMPTS}):`,
        result.error.code,
        result.error.message,
      );
    }
  }, []);

  const handleForegroundNotification = useCallback((notification: RemoteNotification) => {
    // Show a non-blocking toast for foreground notifications
    const text = notification.title
      ? `${notification.title}${notification.body ? ` \u2014 ${notification.body}` : ''}`
      : notification.body ?? 'New notification';
    showToast(text, 'info');
  }, [showToast]);

  const handleNotificationTap = useCallback(
    (notification: RemoteNotification) => {
      const target = resolveNotificationRoute(notification, user?.role);
      if (target) {
        navigateFromOutside(target.name, target.params);
        return;
      }
      // No route resolved — fall back to a toast so the user at least sees
      // confirmation that the tap registered.
      if (notification.title) {
        showToast(notification.title, 'info');
      }
    },
    [showToast, user?.role],
  );

  // Register FCM token when user is authenticated
  useEffect(() => {
    if (phase !== 'ready' || !user) {
      registeredTokenRef.current = null;
      return;
    }

    let tokenRefreshUnsubscribe: (() => void) | undefined;

    let cancelled = false;
    (async () => {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission || cancelled) return;

      const token = await getFcmToken();
      if (token && !cancelled) {
        await registerToken(token);
      }

      // Listen for token refreshes. Guard with `cancelled` so a late callback
      // (after the user has logged out or the provider unmounted) doesn't
      // re-register a token for a session that no longer exists.
      if (!cancelled) {
        tokenRefreshUnsubscribe = onTokenRefresh((newToken) => {
          if (cancelled) return;
          registerToken(newToken).catch(() => {});
        });
      }
    })().catch(() => {});

    return () => {
      cancelled = true;
      tokenRefreshUnsubscribe?.();
    };
  }, [phase, user, registerToken]);

  // Listen for foreground notifications
  useEffect(() => {
    if (phase !== 'ready') return;

    const unsubForeground = onForegroundMessage(handleForegroundNotification);
    const unsubOpenedApp = onNotificationOpenedApp(handleNotificationTap);

    // Check if app was opened from a notification (cold start)
    let cancelled = false;
    getInitialNotification().then((notification) => {
      if (cancelled || !notification) return;
      handleNotificationTap(notification);
    });

    return () => {
      cancelled = true;
      unsubForeground();
      unsubOpenedApp();
    };
  }, [phase, handleForegroundNotification, handleNotificationTap]);

  const doRequestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await requestNotificationPermission();
    if (granted) {
      const token = await getFcmToken();
      if (token) {
        await registerToken(token);
      }
    }
    return granted;
  }, [registerToken]);

  return (
    <NotificationContext.Provider value={useMemo(() => ({ requestPermission: doRequestPermission }), [doRequestPermission])}>
      {children}
    </NotificationContext.Provider>
  );
}
