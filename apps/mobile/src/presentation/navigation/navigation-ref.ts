import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

/**
 * Global navigation ref. Attach it to the root <NavigationContainer ref={...} />
 * in App.tsx and import it from non-component code (e.g. the notification
 * context) when you need to navigate without access to a screen's hooks.
 *
 * Type intentionally loose (`any` route name) — the call sites are a small
 * set of well-known notification routes; over-typing the helper would
 * couple this module to every nested ParamList in the tree.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const navigationRef = createNavigationContainerRef<any>();

/**
 * Navigate to a route from outside the React tree (e.g. a notification tap
 * handler). Safe to call before the navigator has mounted — the call is
 * silently dropped, which is the desired behavior for a notification that
 * arrives during cold-start before navigation is ready (the cold-start path
 * uses `getInitialNotification` instead, which fires after mount).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function navigateFromOutside(name: string, params?: Record<string, any>) {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(CommonActions.navigate({ name, params }));
}
