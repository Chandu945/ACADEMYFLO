'use client';

import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import type { AdminUser } from '@/domain/admin/auth';
import { AppError } from '@/domain/common/errors';
import * as authService from '@/application/auth/admin-auth.service';

/** Refresh interval — 8 minutes (well within 15-min JWT TTL). */
const REFRESH_INTERVAL_MS = 8 * 60 * 1000;

type AdminAuthContextValue = {
  user: AdminUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AppError | null>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

function decodeAdminUser(token: string): AdminUser | null {
  try {
    const base64Url = token.split('.')[1] ?? '';
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return {
      id: payload.sub ?? '',
      email: payload.email ?? '',
      fullName: payload.fullName ?? '',
      role: 'SUPER_ADMIN',
    };
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const result = await authService.refreshAccessToken();
      const decoded = decodeAdminUser(result.accessToken);
      setAccessToken(result.accessToken);
      if (decoded) setUser(decoded);
    } catch {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  // Initial auth — always refresh from the httpOnly session cookie.
  // Intentionally NO sessionStorage handoff from the login page: caching the
  // accessToken in sessionStorage exposes it to any XSS, and saving ~100ms on
  // first-page-load-after-login is not worth that trade.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await authService.refreshAccessToken();
        if (!cancelled) {
          setAccessToken(result.accessToken);
          const decoded = decodeAdminUser(result.accessToken);
          if (decoded) setUser(decoded);
        }
      } catch {
        // Not authenticated — that's fine
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Periodic refresh to keep the access token alive
  useEffect(() => {
    if (!accessToken) return;
    const interval = setInterval(() => { refreshAuth(); }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [accessToken, refreshAuth]);

  const loginFn = useCallback(async (email: string, password: string): Promise<AppError | null> => {
    try {
      const session = await authService.login(email, password);
      setAccessToken(session.accessToken);
      setUser(session.user);
      return null;
    } catch (err) {
      if (err instanceof AppError) return err;
      return AppError.unknown();
    }
  }, []);

  const logoutFn = useCallback(async () => {
    await authService.logout(accessToken ?? undefined);
    setUser(null);
    setAccessToken(null);
    window.location.href = '/login';
  }, [accessToken]);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: !!user && !!accessToken,
      isLoading,
      login: loginFn,
      logout: logoutFn,
    }),
    [user, accessToken, isLoading, loginFn, logoutFn],
  );

  return createElement(AdminAuthContext.Provider, { value }, children);
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return ctx;
}
