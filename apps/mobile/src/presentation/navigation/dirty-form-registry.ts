/**
 * Tiny module-scoped counter that tracks whether any screen currently has
 * unsaved changes. The unsaved-changes hook increments on mount when
 * `hasUnsavedChanges` is true and decrements on cleanup; the tab-press
 * handlers in OwnerTabs / StaffTabs / ParentTabs read it to decide whether
 * to perform their auto-reset-to-tab-root behaviour.
 *
 * Why: when a tab is tapped while a focused form is dirty, the
 * unsaved-changes hook prevents default and shows a "Discard changes?"
 * prompt. The tab navigators' own tabPress listeners run in parallel and,
 * if they navigate immediately, race ahead of the prompt and the user
 * loses the form before they can pick "Stay". A registry-based gate is
 * the simplest cross-listener coordination that doesn't depend on
 * listener-registration order.
 *
 * Counter, not boolean: more than one screen can be tracking dirty state
 * at the same time (e.g. a stack with two pushed forms).
 */

type DiscardCallback = () => void;

let dirtyCount = 0;
const discardCallbacks = new Set<DiscardCallback>();

/**
 * Register that a form is currently dirty. The optional `onDiscard`
 * callback is invoked by `discardAllDirtyForms()` when the user picks
 * "Discard" in the tab navigator's prompt — it should set the form's
 * bypass flag and dispatch `popToTop` on the form's own (focused)
 * navigation, which is the only reliable way to remove the form from
 * the navigator tree from another emitter's listener.
 */
export function registerDirtyForm(onDiscard?: DiscardCallback): () => void {
  dirtyCount += 1;
  if (onDiscard) discardCallbacks.add(onDiscard);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    dirtyCount = Math.max(0, dirtyCount - 1);
    if (onDiscard) discardCallbacks.delete(onDiscard);
  };
}

export function hasAnyDirtyForm(): boolean {
  return dirtyCount > 0;
}

/**
 * Run every registered Discard callback. Used by the tab navigators when
 * the user has confirmed Discard in their tabPress prompt — each form
 * pops itself off using its own focused navigation (which is the only
 * way that reliably triggers the underlying beforeRemove + cleanup
 * lifecycle).
 *
 * Iterating a snapshot because each callback's cleanup mutates the set.
 */
export function discardAllDirtyForms(): void {
  for (const cb of [...discardCallbacks]) {
    try {
      cb();
    } catch {
      /* a single callback failure must not block the others */
    }
  }
}
