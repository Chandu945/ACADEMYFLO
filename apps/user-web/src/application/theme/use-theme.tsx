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

/* ── Types ──────────────────────────────────────────────────────────────── */

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  /** The user-chosen mode (light | dark | system) */
  mode: ThemeMode;
  /** Update the theme mode */
  setMode: (mode: ThemeMode) => void;
  /** Whether the resolved (effective) theme is dark */
  isDark: boolean;
}

const STORAGE_KEY = 'pc_theme';
const VALID_MODES: ThemeMode[] = ['light', 'dark', 'system'];

/* ── Context ────────────────────────────────────────────────────────────── */

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/* ── Provider ───────────────────────────────────────────────────────────── */

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [systemDark, setSystemDark] = useState(false);

  /* Read persisted preference on mount */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VALID_MODES.includes(stored as ThemeMode)) {
        setModeState(stored as ThemeMode);
      }
    } catch {
      // localStorage unavailable — keep default
    }
  }, []);

  /* Listen for system color-scheme changes */
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mql.matches);

    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  /* Apply data-theme attribute whenever mode or systemDark changes */
  useEffect(() => {
    const resolved =
      mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
    document.documentElement.dataset.theme = mode === 'system' ? 'system' : resolved;

    // We keep data-theme="system" so the CSS @media query handles it,
    // but we also need isDark to reflect the resolved value.
  }, [mode, systemDark]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const isDark = mode === 'system' ? systemDark : mode === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, setMode, isDark }),
    [mode, setMode, isDark],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/* ── Hook ───────────────────────────────────────────────────────────────── */

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
