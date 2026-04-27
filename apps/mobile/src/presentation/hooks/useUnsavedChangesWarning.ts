import { useEffect, useRef } from 'react';
import { crossAlert } from '../utils/crossPlatformAlert';
import { useNavigation, StackActions } from '@react-navigation/native';

/**
 * Warns users before leaving a screen with unsaved form changes.
 *
 * Catches two leave paths:
 *   1. `beforeRemove` — hardware back, swipe back, navigation.goBack()
 *   2. `tabPress` — bottom-tab tap. Without this, tapping a tab while on a
 *      dirty form silently popToTops via the OwnerTabs handler (so coming
 *      back to the section shows the list — but the user has lost their
 *      work without warning), or worse, the form stays mounted and they
 *      land on the dirty form again instead of the list.
 *
 * A shared bypass ref prevents double-prompts when the tabPress path
 * triggers a popToTop, which would otherwise re-fire `beforeRemove`.
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  const navigation = useNavigation();
  const bypassRef = useRef(false);

  useEffect(() => {
    if (!hasUnsavedChanges || typeof navigation.addListener !== 'function') return;

    const unsubBeforeRemove = navigation.addListener('beforeRemove', (e) => {
      if (bypassRef.current) {
        // The user already confirmed Discard via the tabPress path; let
        // this synthesised popToTop go through without re-prompting.
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

    // Tab-press path
    const tabNav = navigation.getParent?.();
    let unsubTabPress: (() => void) | undefined;
    if (tabNav && typeof tabNav.addListener === 'function') {
      unsubTabPress = tabNav.addListener(
        'tabPress' as never,
        (e: { preventDefault: () => void; target?: string }) => {
          // Only the currently-focused form should respond. Without this,
          // dirty forms in *other* tabs would also fire prompts on the same
          // tab tap (since listeners fire regardless of focus).
          if (typeof navigation.isFocused === 'function' && !navigation.isFocused()) {
            return;
          }
          if (bypassRef.current) return;
          e.preventDefault();
          const targetTabName = String(e.target ?? '').split('-')[0];
          crossAlert(
            'Discard changes?',
            'You have unsaved changes. Are you sure you want to leave?',
            [
              { text: 'Stay', style: 'cancel' },
              {
                text: 'Discard',
                style: 'destructive',
                onPress: () => {
                  // Set bypass before dispatching so the resulting
                  // beforeRemove doesn't loop back into another prompt.
                  bypassRef.current = true;
                  // Pop the dirty form off so returning to this tab lands
                  // on the section's list instead of the form.
                  navigation.dispatch(StackActions.popToTop());
                  // Switch to whichever tab the user actually tapped
                  // (no-op if it's the same tab they're already on).
                  if (targetTabName) {
                    (tabNav as unknown as { navigate: (name: string) => void }).navigate(
                      targetTabName,
                    );
                  }
                },
              },
            ],
          );
        },
      );
    }

    return () => {
      unsubBeforeRemove();
      unsubTabPress?.();
    };
  }, [hasUnsavedChanges, navigation]);
}
