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

  const registerToken = useCallback(async (token: string) => {
    if (registeredTokenRef.current === token) return;
    const result = await registerPushTokenUseCase(token, { pushTokenApi });
    if (result.ok) {
      registeredTokenRef.current = token;
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

      // Listen for token refreshes
      if (!cancelled) {
        tokenRefreshUnsubscribe = onTokenRefresh((newToken) => {
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
