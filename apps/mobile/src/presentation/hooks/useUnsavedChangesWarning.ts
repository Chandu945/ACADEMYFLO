import { useEffect, useRef } from 'react';
import { crossAlert } from '../utils/crossPlatformAlert';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { registerDirtyForm } from '../navigation/dirty-form-registry';

/**
 * Warns users before leaving a screen with unsaved form changes.
 *
 * Two leave paths are handled:
 *   1. `beforeRemove` — hardware back, swipe back, navigation.goBack(),
 *      header back arrow. The hook owns the prompt for this path.
 *   2. Bottom-tab tap — the **tab navigators** (OwnerTabs / StaffTabs /
 *      ParentTabs) own the prompt because their `screenListeners.tabPress`
 *      runs on the same `navigation` instance the tab bar emits to —
 *      `navigation.getParent().addListener('tabPress', ...)` from inside
 *      a deeply nested stack didn't reliably receive events on
 *      mobile-web. The discard ACTION still lives here though: this hook
 *      registers a per-form discard callback via `registerDirtyForm` so
 *      the tab navigator can pop the form using the form's own focused
 *      navigation (the only reliable way), wrapped in a one-shot
 *      `bypassRef` so the form's own beforeRemove doesn't re-prompt.
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  const navigation = useNavigation();
  const bypassRef = useRef(false);

  // Register a Discard callback the tab navigators can call. The callback
  // sets bypass, then pops this stack via the form's own focused
  // navigation. `useRef` keeps the latest values inside the (stable)
  // callback so we don't re-register on every render.
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    return registerDirtyForm(() => {
      bypassRef.current = true;
      try {
        // Reset this stack to its root screen rather than popToTop:
        //  - popToTop is a no-op when the form is the only screen in
        //    the stack (e.g. opened directly via the global '+' FAB),
        //    so the form would never unmount and the dirty counter
        //    would never decrement, causing an infinite Discard-prompt
        //    loop on every subsequent tab tap.
        //  - reset always rebuilds the stack as exactly [root], so the
        //    form is guaranteed to be removed regardless of how it was
        //    reached.
        // `routeNames[0]` is the navigator's first-registered route,
        // which by RN convention is the stack's intended root
        // (StudentsList for StudentsStack, MoreHome for MoreStack, …).
        const nav = navigationRef.current as unknown as {
          getState?: () => { routeNames?: string[] } | undefined;
          dispatch: (action: unknown) => void;
        };
        const state = nav.getState?.();
        const rootRouteName = state?.routeNames?.[0];
        if (rootRouteName) {
          nav.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: rootRouteName }],
            }),
          );
        }
      } catch {
        /* a single discard failure must not block the tab switch */
      }
    });
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges || typeof navigation.addListener !== 'function') return;

    const unsubBeforeRemove = navigation.addListener('beforeRemove', (e) => {
      if (bypassRef.current) {
        // The user already confirmed Discard via the tab-navigator
        // prompt; let this synthesised pop go through without
        // re-prompting (otherwise we'd get an infinite loop).
        bypassRef.current = false;
        return;
      }
      e.preventDefault();
      crossAlert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      );
    });

    return () => {
      unsubBeforeRemove();
    };
  }, [hasUnsavedChanges, navigation]);
}
