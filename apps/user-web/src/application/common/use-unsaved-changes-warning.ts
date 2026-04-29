'use client';

import { useEffect } from 'react';

/**
 * Web equivalent of apps/mobile's useUnsavedChangesWarning.
 *
 * The mobile hook intercepts React Navigation `beforeRemove` and `tabPress`
 * events; the closest web primitive is `beforeunload`, which covers tab
 * close, refresh, and navigation away from the origin. Intra-app navigation
 * (clicking an internal Link) is NOT covered — the App Router doesn't
 * expose a public way to intercept it. That's a known web platform gap;
 * forms should rely on inline confirm dialogs for in-app nav if they need
 * to be airtight.
 *
 * Usage:
 *   useUnsavedChangesWarning(isDirty && !justSaved);
 *
 * The browser controls the dialog text — modern browsers ignore custom
 * messages and show their own ("Changes you made may not be saved"). The
 * empty `returnValue` assignment is the standard idiom to trigger the
 * prompt across all browsers.
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean): void {
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    if (typeof window === 'undefined') return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required for legacy browsers; modern browsers ignore the string but
      // still need `returnValue` to be set (or e.preventDefault) to prompt.
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);
}
