import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { lightColors, darkColors } from '../theme';
import type { Colors } from '../theme';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  colors: Colors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const SERVICE = 'academyflo_theme';

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  mode: 'system',
  setMode: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Load persisted preference
  useEffect(() => {
    Keychain.getGenericPassword({ service: SERVICE })
      .then((result) => {
        if (result && (result.password === 'light' || result.password === 'dark' || result.password === 'system')) {
          setModeState(result.password as ThemeMode);
        }
      })
      .catch(() => {});
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    Keychain.setGenericPassword('theme', newMode, { service: SERVICE }).catch(() => {});
  }, []);

  const isDark = mode === 'system'
    ? systemScheme === 'dark'
    : mode === 'dark';

  const colors = isDark ? darkColors : lightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, isDark, mode, setMode }),
    [colors, isDark, mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
