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

type AdminAuthContextValue = {
  user: AdminUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AppError | null>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function tryRefresh() {
      try {
        const result = await authService.refreshAccessToken();
        if (!cancelled) {
          setAccessToken(result.accessToken);
          // Decode user from token payload (base64 JWT)
          const payload = JSON.parse(atob(result.accessToken.split('.')[1]!));
          setUser({
            id: payload.sub,
            email: payload.email,
            fullName: payload.fullName,
            role: 'SUPER_ADMIN',
          });
        }
      } catch {
        // Not authenticated — that's fine
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    tryRefresh();
    return () => {
      cancelled = true;
    };
  }, []);

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
