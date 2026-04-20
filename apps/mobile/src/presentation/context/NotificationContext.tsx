import React, { createContext, useContext, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
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
import type { RemoteNotification } from '../../domain/notification/notification.types';

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

  const handleNotificationTap = useCallback((notification: RemoteNotification) => {
    // Provide user feedback that the notification tap was received.
    // Full deep-link routing requires the linking config in App.tsx.
    if (notification.title) {
      showToast(notification.title, 'info');
    }
  }, [showToast]);

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
