/**
 * Pending deep-link queue.
 *
 * When a parent or coach taps a push notification that should land on a
 * screen *deeper* than a tab root (e.g., ChildDetail/[id], EnquiryDetail/[id]),
 * we can't navigate directly to that screen — the codebase comment in
 * NotificationContext.tsx explains why: deep routes assume specific stack
 * ancestors, and a missing-ancestor entry produces ghost-screen bugs in the
 * back-button handlers.
 *
 * Solution: a two-stage hop.
 *
 *   1. NotificationContext sets a "pending deep link" via setPendingDeepLink
 *      and navigates to the **stack root** (a tab name like 'Children' or
 *      'More').
 *   2. The stack-root screen (ChildrenListScreen / MoreScreen) reads the
 *      pending deep link in a useFocusEffect on mount/focus, calls
 *      navigation.push() for each step in the chain, and clears the queue.
 *
 * Result: stack ancestry is built incrementally — `[Root → MidScreen →
 * LeafScreen]` — so every screen's back button works as designed.
 *
 * The pending value is module-level (a single ref) because:
 *   - Only one push tap is in flight at a time (taps are user-driven and
 *     handled synchronously in NotificationContext).
 *   - Latest-tap-wins semantics: a second tap replaces the first.
 *   - The consume-once contract prevents re-firing on subsequent re-focuses.
 */

export interface DeepLinkStep {
  screen: string;
  params?: Record<string, unknown>;
}

export interface DeepLinkTarget {
  /**
   * Identifier of the navigator/stack the chain should be pushed onto.
   * Currently 'ParentHome' (parent's children stack) or 'More' (the
   * owner/staff/parent More-tab stack). Used by consumers to filter:
   * ChildrenListScreen consumes 'ParentHome', MoreScreen consumes 'More'.
   */
  stack: 'ParentHome' | 'More';
  /**
   * Ordered list of screens to push onto the stack. The consumer iterates
   * and calls navigation.push for each step.
   */
  chain: DeepLinkStep[];
}

let pending: DeepLinkTarget | null = null;

/**
 * Stage a deep-link target. Replaces any previously-staged value (latest
 * tap wins). Does not navigate — the caller is expected to navigate to
 * the relevant tab root immediately after, so the consuming screen
 * picks it up in its focus effect.
 */
export function setPendingDeepLink(target: DeepLinkTarget): void {
  pending = target;
}

/**
 * Consume the pending deep link if it's targeted at the given stack.
 * Returns the target and clears the queue, so subsequent focus-effect
 * runs (e.g., user navigating away and back) don't re-fire.
 */
export function consumePendingDeepLink(stack: DeepLinkTarget['stack']): DeepLinkTarget | null {
  if (!pending || pending.stack !== stack) return null;
  const consumed = pending;
  pending = null;
  return consumed;
}

/**
 * Test/dev helper. Production code should never call this — the consume
 * contract handles cleanup naturally.
 */
export function _resetPendingDeepLinkForTests(): void {
  pending = null;
}
