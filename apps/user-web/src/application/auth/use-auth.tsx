'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { UserRole } from '@academyflo/contracts';

type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  profilePhotoUrl?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** True when the session was invalidated server-side (refresh failed
   *  while we were authenticated) — distinguishes a forced sign-out from
   *  a manual logout so the login screen can show "Session expired".
   *  Mirrors apps/mobile AuthContext.sessionExpired. */
  sessionExpired: boolean;
};

type AuthContextValue = AuthState & {
  login: (identifier: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  dismissSessionExpired: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Module-level singleton — ensures only ONE refresh call happens even if
// the component mounts multiple times (React 18 strict mode, fast navigations).
let _initPromise: Promise<{ accessToken: string } | null> | null = null;

type AuthResponse = { accessToken: string; user?: AuthUser };

/** Default refresh interval — 8 minutes. */
const REFRESH_INTERVAL_MS = 8 * 60 * 1000;

function initAuth(): Promise<AuthResponse | null> {
  if (_initPromise) return _initPromise;
  _initPromise = fetch('/api/auth/refresh', { method: 'POST' })
    .then((res) => {
      _initPromise = null;
      if (!res.ok) return null;
      return res.json() as Promise<AuthResponse>;
    })
    .catch(() => {
      _initPromise = null;
      return null;
    });
  return _initPromise;
}

/** Reset the singleton so next AuthProvider mount gets a fresh refresh. */
export function resetInitAuth(): void {
  _initPromise = null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isLoading: true,
    isAuthenticated: false,
    sessionExpired: false,
  });
  const [initialAuthDone, setInitialAuthDone] = useState(false);

  const refreshAuth = useCallback(async () => {
    // Capture authenticated-ness at call time. If we were authenticated and
    // the refresh fails, that's a server-side invalidation → set
    // sessionExpired so the login screen can show the "session expired"
    // banner. If we weren't authenticated, this is normal and not "expired".
    const wasAuthenticated = state.isAuthenticated;
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (!res.ok) {
        setState({
          user: null,
          accessToken: null,
          isLoading: false,
          isAuthenticated: false,
          sessionExpired: wasAuthenticated,
        });
        return;
      }
      const data: AuthResponse = await res.json();
      if (!data.user) {
        setState({
          user: null,
          accessToken: null,
          isLoading: false,
          isAuthenticated: false,
          sessionExpired: wasAuthenticated,
        });
        return;
      }
      setState({
        user: data.user,
        accessToken: data.accessToken,
        isLoading: false,
        isAuthenticated: true,
        sessionExpired: false,
      });
    } catch {
      setState({
        user: null,
        accessToken: null,
        isLoading: false,
        isAuthenticated: false,
        sessionExpired: wasAuthenticated,
      });
    }
  }, [state.isAuthenticated]);

  // Initial auth: refresh from server (session cookie → fresh access token + user)
  useEffect(() => {
    let cancelled = false;
    initAuth().then((data) => {
      if (cancelled) return;
      if (data?.accessToken && data.user) {
        setState({
          user: data.user,
          accessToken: data.accessToken,
          isLoading: false,
          isAuthenticated: true,
          sessionExpired: false,
        });
      } else {
        // Cold boot with no valid session — normal, not "expired".
        setState({
          user: null,
          accessToken: null,
          isLoading: false,
          isAuthenticated: false,
          sessionExpired: false,
        });
      }
      setInitialAuthDone(true);
    });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.message || 'Login failed' };
      }
      if (!data.accessToken || !data.user) {
        return { ok: false, error: 'Invalid login response. Please try again.' };
      }
      _initPromise = null; // Reset so post-login navigation gets a fresh refresh
      setState({
        user: data.user,
        accessToken: data.accessToken,
        isLoading: false,
        isAuthenticated: true,
        sessionExpired: false,
      });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      _initPromise = null;
      // Manual logout — never flag as session-expired.
      setState({
        user: null,
        accessToken: null,
        isLoading: false,
        isAuthenticated: false,
        sessionExpired: false,
      });
      router.replace('/login');
    }
  }, [router]);

  const dismissSessionExpired = useCallback(() => {
    setState((prev) => (prev.sessionExpired ? { ...prev, sessionExpired: false } : prev));
  }, []);

  const value = useMemo(
    () => ({ ...state, login, logout, refreshAuth, dismissSessionExpired }),
    [state, login, logout, refreshAuth, dismissSessionExpired],
  );

  // Periodically refresh the access token while authenticated
  useEffect(() => {
    if (!state.isAuthenticated) return;
    const interval = setInterval(() => {
      refreshAuth().catch(() => {});
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [state.isAuthenticated, refreshAuth]);

  // Redirect to login when auth resolution completes but user is not authenticated.
  // This handles expired sessions where the cookie exists (middleware let us through)
  // but the refresh token is no longer valid.
  useEffect(() => {
    if (initialAuthDone && !state.isLoading && !state.isAuthenticated) {
      const returnTo = pathname && pathname !== '/login' ? `?returnTo=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${returnTo}`);
    }
  }, [initialAuthDone, state.isLoading, state.isAuthenticated, pathname, router]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
