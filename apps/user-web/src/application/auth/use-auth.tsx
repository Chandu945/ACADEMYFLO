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

type UserRole = 'OWNER' | 'STAFF' | 'PARENT';

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
};

type AuthContextValue = AuthState & {
  login: (identifier: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
};

type SignupData = {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Module-level singleton — ensures only ONE refresh call happens even if
// the component mounts multiple times (React 18 strict mode, fast navigations).
let _initPromise: Promise<{ accessToken: string } | null> | null = null;

function initAuth(): Promise<{ accessToken: string } | null> {
  if (_initPromise) return _initPromise;
  _initPromise = fetch('/api/auth/refresh', { method: 'POST' })
    .then((res) => (res.ok ? (res.json() as Promise<{ accessToken: string }>) : null))
    .catch(() => null);
  return _initPromise;
}

function decodeUserFromToken(token: string): AuthUser | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload));
    return {
      id: decoded.sub ?? decoded.userId,
      fullName: decoded.fullName ?? '',
      email: decoded.email ?? '',
      phoneNumber: decoded.phoneNumber ?? '',
      role: decoded.role ?? 'OWNER',
      profilePhotoUrl: decoded.profilePhotoUrl ?? null,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (!res.ok) {
        setState({ user: null, accessToken: null, isLoading: false, isAuthenticated: false });
        return;
      }
      const data = await res.json();
      const user = decodeUserFromToken(data.accessToken);
      setState({
        user,
        accessToken: data.accessToken,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      setState({ user: null, accessToken: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    initAuth().then((data) => {
      if (cancelled) return;
      if (data?.accessToken) {
        const user = decodeUserFromToken(data.accessToken);
        setState({
          user,
          accessToken: data.accessToken,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState({ user: null, accessToken: null, isLoading: false, isAuthenticated: false });
      }
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
      _initPromise = null; // Reset so post-login navigation gets a fresh refresh
      const user = decodeUserFromToken(data.accessToken);
      setState({
        user,
        accessToken: data.accessToken,
        isLoading: false,
        isAuthenticated: true,
      });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const signup = useCallback(async (signupData: SignupData) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.message || 'Signup failed' };
      }
      const user = decodeUserFromToken(data.accessToken);
      setState({
        user,
        accessToken: data.accessToken,
        isLoading: false,
        isAuthenticated: true,
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
      _initPromise = null; // Reset so next login gets a fresh refresh
      setState({ user: null, accessToken: null, isLoading: false, isAuthenticated: false });
      window.location.href = '/login';
    }
  }, []);

  const value = useMemo(
    () => ({ ...state, login, signup, logout, refreshAuth }),
    [state, login, signup, logout, refreshAuth],
  );

  // Redirect to login when auth resolution completes but user is not authenticated.
  // This handles expired sessions where the cookie exists (middleware let us through)
  // but the refresh token is no longer valid.
  useEffect(() => {
    if (!state.isLoading && !state.isAuthenticated) {
      window.location.href = '/login';
    }
  }, [state.isLoading, state.isAuthenticated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
