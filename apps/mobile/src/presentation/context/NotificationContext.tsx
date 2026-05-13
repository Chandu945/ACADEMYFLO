import React, { createContext, useContext, useEffect, useMemo, useRef, useCallback } from 'react';
import { StackActions } from '@react-navigation/native';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { navigateFromOutside, dispatchFromOutside } from '../navigation/navigation-ref';
import {
  setPendingDeepLink,
  consumePendingDeepLink,
  type DeepLinkTarget,
} from '../navigation/pending-deep-link';
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
import type {
  RemoteNotification,
  NotificationType,
} from '../../domain/notification/notification.types';
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
  // Sent by the backend's delayed absence-notification job. Routed to the
  // parent's Children tab — the explicit Children list is the safe stack
  // root from which the parent picks the relevant child to see today's
  // attendance. Deep-linking to ChildDetail directly is intentionally not
  // attempted (see SAFE_OVERRIDE_ROUTES rationale below).
  STUDENT_ABSENCE: {
    PARENT: 'Children',
    OWNER: 'Attendance',
    STAFF: 'Attendance',
  },
  // Fired when staff submits a payment request. Routed to the Fees tab,
  // whose home screen renders the pending-approvals queue inline. PARENT
  // doesn't receive this push (only owners can act on it), but the entry
  // is required because Record<NotificationType, ...> demands every type.
  PAYMENT_REQUEST_PENDING: {
    OWNER: 'Fees',
    STAFF: 'Fees',
  },
  // Fired when a new enquiry is created. Lands on the More tab; the team
  // member taps "Enquiries" from the menu to see the lead at the top of
  // the list. PARENT never receives this push.
  ENQUIRY_NEW: {
    OWNER: 'More',
    STAFF: 'More',
  },
  // Owner approved a parent's manual payment. Parent lands on the Payments
  // tab where the approved payment shows in the history with its receipt.
  MANUAL_PAYMENT_APPROVED: {
    PARENT: 'Payments',
  },
  // Owner rejected a parent's manual payment. Parent lands on Children to
  // pick the kid and re-submit the payment with corrections.
  MANUAL_PAYMENT_REJECTED: {
    PARENT: 'Children',
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
  // G2 mobile-alignment fix: route entries for the new push types the
  // backend already emits. Pre-fix these collapsed to 'SYSTEM' → 'More'
  // tab, so tapping (for instance) a holiday notification dumped the
  // parent on the More menu instead of the Children tab where the
  // updated holiday/attendance state is visible.
  //
  // Owner used mark-fee-paid while a parent payment request was pending.
  // The parent's submitted request was auto-cancelled; the matching push
  // sends them to Payments where the resolved entry sits with its receipt.
  MANUAL_PAYMENT_AUTO_RESOLVED: {
    PARENT: 'Payments',
  },
  // Owner declared a holiday — parents land on the Children tab where
  // tomorrow's attendance + holidays for the linked kids are visible.
  // Owners/staff land on Attendance for the calendar / holiday list.
  HOLIDAY_DECLARED: {
    PARENT: 'Children',
    OWNER: 'Attendance',
    STAFF: 'Attendance',
  },
  // Holiday cancelled — same surfaces as HOLIDAY_DECLARED. The push body
  // tells the user "classes are running"; the landing screen shows the
  // restored schedule.
  HOLIDAY_REMOVED: {
    PARENT: 'Children',
    OWNER: 'Attendance',
    STAFF: 'Attendance',
  },
  // Event cancelled — push goes to all linked parents. They don't have a
  // dedicated events tab, so land on Children (their home stack root). The
  // toast body conveys the cancellation; the tab is just a sensible focus.
  EVENT_CANCELLED: {
    PARENT: 'Children',
  },
  // Parent withdrew their own manual-payment request — only owners (and
  // optionally staff who help triage the queue) receive this push so they
  // know why the entry vanished. Lands on Fees where the queue lives.
  MANUAL_PAYMENT_WITHDRAWN: {
    OWNER: 'Fees',
    STAFF: 'Fees',
  },
  // Student status changed by owner — parents linked to the student get
  // the push. Children tab is the parent's home; the status change shows
  // on each ChildSummary card and in ChildDetail.
  STUDENT_STATUS_CHANGED: {
    PARENT: 'Children',
  },
};

// Whitelist of route names the backend may target via `data.route`. Limited
// to top-level tab names so any landing has a sensible "back" target — every
// tab has a stack root that's always present in history. Deep routes
// (StaffForm, EnquiryDetail, ChildDetail, etc.) are deliberately excluded
// because they assume specific stack ancestors and a missing-ancestor entry
// produces ghost-screen bugs in the form/back-button handlers.
//
// To add a new override target: ensure landing on it from a fresh state
// leaves a sensible stack — i.e. its stack root is always reachable via
// `goBack`/`navigate('XList')` — then add the name here.
const SAFE_OVERRIDE_ROUTES: ReadonlySet<string> = new Set([
  // Owner / Staff tabs
  'Dashboard',
  'Students',
  'Attendance',
  'Fees',
  // Parent tabs
  'Children',
  'Payments',
  // Shared
  'More',
]);

/**
 * Phase B — deep-link targets that land *past* a tab root.
 *
 * For each (notification type, role) pair listed here, the resolver stages
 * a chain of pushes via `setPendingDeepLink` and returns the tab to focus
 * first. The relevant stack-root screen (ChildrenListScreen for 'Children',
 * MoreScreen for 'More') reads the staged value in its useFocusEffect and
 * pushes each step in order — building a clean back-stack like
 * `[Root → Mid → Leaf]`.
 *
 * Returns `null` for types that don't deep-link past tab roots; those
 * fall through to the existing tab-root routing in ROUTE_BY_TYPE.
 */
function resolveDeepLinkTarget(
  notification: RemoteNotification,
  role: UserRole | undefined,
): { tab: string; target: DeepLinkTarget } | null {
  if (!role) return null;
  const data = notification.data ?? {};

  if (notification.type === 'STUDENT_ABSENCE' && role === 'PARENT' && data['studentId']) {
    return {
      tab: 'Children',
      target: {
        stack: 'ParentHome',
        chain: [
          {
            screen: 'ChildDetail',
            params: {
              studentId: data['studentId'],
              fullName: data['studentName'] ?? '',
            },
          },
        ],
      },
    };
  }

  if (notification.type === 'MANUAL_PAYMENT_REJECTED' && role === 'PARENT' && data['studentId']) {
    return {
      tab: 'Children',
      target: {
        stack: 'ParentHome',
        chain: [
          {
            screen: 'ChildDetail',
            params: {
              studentId: data['studentId'],
              fullName: data['studentName'] ?? '',
            },
          },
        ],
      },
    };
  }

  if (
    notification.type === 'ENQUIRY_NEW' &&
    (role === 'OWNER' || role === 'STAFF') &&
    data['enquiryId']
  ) {
    return {
      tab: 'More',
      target: {
        stack: 'More',
        chain: [
          { screen: 'EnquiryList' },
          { screen: 'EnquiryDetail', params: { enquiryId: data['enquiryId'] } },
        ],
      },
    };
  }

  return null;
}

function resolveNotificationRoute(
  notification: RemoteNotification,
  role: UserRole | undefined,
): { name: string; params?: Record<string, string> } | null {
  if (!role) return null;
  const data = notification.data ?? {};
  const dataRoute = data['route'];
  // Backend-supplied route wins, but only if it's in the whitelist above.
  // Falling through to the type-default route for anything else guarantees
  // the user lands on a screen whose stack ancestors are correctly set up.
  if (typeof dataRoute === 'string' && SAFE_OVERRIDE_ROUTES.has(dataRoute)) {
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

  const handleForegroundNotification = useCallback(
    (notification: RemoteNotification) => {
      // Show a non-blocking toast for foreground notifications
      const text = notification.title
        ? `${notification.title}${notification.body ? ` \u2014 ${notification.body}` : ''}`
        : (notification.body ?? 'New notification');
      showToast(text, 'info');
    },
    [showToast],
  );

  const handleNotificationTap = useCallback(
    (notification: RemoteNotification) => {
      // Phase B: prefer deep-link routing when a (type, role) pair has a
      // staged target. The chain is normally consumed by the relevant
      // stack-root screen on focus — see pending-deep-link.ts for the
      // contract.
      const deep = resolveDeepLinkTarget(notification, user?.role);
      if (deep) {
        setPendingDeepLink(deep.target);
        navigateFromOutside(deep.tab);

        // "Already on target tab" fallback. If the user was already on
        // the tab we just navigated to, focus didn't change → the
        // useFocusEffect consumer in ChildrenListScreen / MoreScreen
        // never re-runs → the staged chain would sit forever. Schedule
        // a tick-later dispatch: if the focus consumer ran first (cold
        // start, different tab), pending is already null and this is a
        // no-op; otherwise we dispatch the chain directly so the deep
        // link still works.
        const stack = deep.target.stack;
        setTimeout(() => {
          const stillPending = consumePendingDeepLink(stack);
          if (!stillPending) return;
          for (const step of stillPending.chain) {
            dispatchFromOutside(StackActions.push(step.screen, step.params));
          }
        }, 50);

        return;
      }
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
    <NotificationContext.Provider
      value={useMemo(() => ({ requestPermission: doRequestPermission }), [doRequestPermission])}
    >
      {children}
    </NotificationContext.Provider>
  );
}
