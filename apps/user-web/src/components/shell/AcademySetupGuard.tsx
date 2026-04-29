'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/application/auth/use-auth';

/**
 * Mirrors apps/mobile's `needsAcademySetup` auth phase. After an Owner
 * signs up they have a USER but no ACADEMY — every protected fetch
 * returns "Please complete academy setup first" or "no academy" until
 * /setup is done. Without this guard the dashboard renders, scary error
 * banners pop up, and the user has no clear path forward.
 *
 * The guard pings the backend once per browser session via /api/subscription.
 * If the response signals a missing academy it redirects to /setup. If the
 * call succeeds (or fails for any other reason) we move on — auth-context
 * already handles 401s, so we don't need to re-handle that here.
 *
 * Owners only: STAFF and PARENT roles always belong to an existing academy
 * by the time they can log in, so they don't need this check.
 */

const SETUP_PATHNAME = '/setup';
const SUBSCRIPTION_BLOCKED_PATHNAME = '/subscription-blocked';

// Module-level flag — once we've confirmed the academy exists in this tab,
// don't re-check on every navigation.
let _academySetupKnownGood = false;

export function AcademySetupGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, accessToken, isLoading, isAuthenticated } = useAuth();
  const [checking, setChecking] = useState(true);
  const checkedRef = useRef(false);

  useEffect(() => {
    // Bail out on auth-loading / unauthenticated — auth context handles those.
    if (isLoading || !isAuthenticated || !accessToken || !user) {
      setChecking(false);
      return;
    }

    // Skip the check on /setup itself (otherwise we'd redirect from /setup
    // to /setup forever) and on subscription-blocked (which already manages
    // its own auth state).
    if (pathname === SETUP_PATHNAME || pathname === SUBSCRIPTION_BLOCKED_PATHNAME) {
      setChecking(false);
      return;
    }

    // STAFF / PARENT always belong to an academy already — short-circuit.
    if (user.role !== 'OWNER') {
      _academySetupKnownGood = true;
      setChecking(false);
      return;
    }

    // Already confirmed in this tab — don't re-check on every navigation.
    if (_academySetupKnownGood) {
      setChecking(false);
      return;
    }

    if (checkedRef.current) return;
    checkedRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/subscription', {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(15000),
        });
        if (cancelled) return;

        if (res.ok) {
          _academySetupKnownGood = true;
          setChecking(false);
          return;
        }

        const json = (await res.json().catch(() => null)) as { message?: string; code?: string } | null;
        const message = json?.message?.toLowerCase() ?? '';
        const code = json?.code ?? '';

        // Heuristic: backend returns CONFLICT or specific text for an Owner
        // without an academy. We're conservative — only redirect on a
        // confident match, otherwise fall through and let the page render
        // its own error (so we don't accidentally trap the user on /setup
        // when the real problem is something else).
        const looksLikeMissingAcademy =
          code === 'CONFLICT' ||
          /complete academy setup/i.test(message) ||
          /no academy/i.test(message) ||
          /academy not found/i.test(message);

        if (looksLikeMissingAcademy) {
          router.replace('/setup');
          return;
        }

        // Some other error — log so it doesn't disappear silently, but let
        // the page render. The user's hooks will surface specific errors.
        if (typeof console !== 'undefined') {
          console.warn('[AcademySetupGuard] unexpected /api/subscription response', res.status, json);
        }
        _academySetupKnownGood = true; // don't loop on this
        setChecking(false);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Network error — assume the worst case (proceed and let page fetches surface their own errors).
        setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, accessToken, isLoading, isAuthenticated, pathname, router]);

  // Brief loading state to avoid a flash-of-broken-dashboard while the
  // setup-state check is in flight. Keep it visually quiet — full-screen
  // spinner would be jarring; an empty fragment is fine because layouts
  // already render the shell shell around us.
  if (checking) return null;
  return <>{children}</>;
}

/** Reset the cached "academy is set up" flag — call after a successful logout
 *  so the next login re-checks. */
export function resetAcademySetupGuard(): void {
  _academySetupKnownGood = false;
}
