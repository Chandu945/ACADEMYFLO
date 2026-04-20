// Initialize Sentry FIRST, before any other module loads, so unhandled
// errors during app startup still get captured. Disabled in dev — see
// sentry.ts for rationale.
import { initSentry, sentryReporter } from './infra/observability/sentry';
import { setErrorReporter } from './presentation/components/system/AppErrorBoundary';
initSentry();
setErrorReporter(sentryReporter);

import React from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import type { LinkingOptions } from '@react-navigation/native';
import { AuthProvider } from './presentation/context/AuthContext';
import { NotificationProvider } from './presentation/context/NotificationContext';
import { ThemeProvider, useTheme } from './presentation/context/ThemeContext';
import { ToastProvider } from './presentation/context/ToastContext';
import { AlertProvider } from './presentation/context/AlertContext';
import { RootNavigator } from './presentation/navigation/RootNavigator';
import { AppErrorBoundary } from './presentation/components/system/AppErrorBoundary';
import { OfflineBanner } from './presentation/components/global/OfflineBanner';
// Sentry import kept ONLY for `Sentry.wrap(App)` below (automatic performance
// tracing). Actual initialization is handled by `initSentry()` at the top of
// this file, which applies PII-safe settings (no sendDefaultPii, no session
// replay, no console-log piping). Do NOT add a second `Sentry.init(...)` call
// here — it would override the safe defaults.
import * as Sentry from '@sentry/react-native';

/**
 * Deep linking configuration — intentionally narrow.
 *
 * Only pre-auth routes (Login, ForgotPassword) are registered. Authenticated
 * screens require a session that's restored in-app, so they are deliberately
 * NOT reachable via external deep links. Any unregistered path is dropped by
 * React Navigation (safe default); we do not want to silently route attacker-
 * crafted links like `academyflo://enquiry/<id>` into authenticated screens.
 *
 * Before registering a new authenticated route here, also add param validation
 * in that screen (don't trust the deep-link payload).
 */
const linking: LinkingOptions<ReactNavigation.RootParamList> = {
  prefixes: ['academyflo://', 'https://academyflo.com'],
  config: {
    screens: {
      AuthStack: {
        screens: {
          Login: 'login',
          ForgotPassword: 'forgot-password',
        },
      },
    },
  },
};

function AppInner() {
  const { colors, isDark } = useTheme();

  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: { ...DarkTheme.colors, background: colors.bg, card: colors.surface, text: colors.text, border: colors.border, primary: colors.primary },
      }
    : {
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.surface, text: colors.text, border: colors.border, primary: colors.primary },
      };

  return (
    <AppErrorBoundary>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <OfflineBanner />
      <NavigationContainer theme={navTheme} linking={linking}>
        <RootNavigator />
      </NavigationContainer>
    </AppErrorBoundary>
  );
}

const rootStyle = { flex: 1 } as const;

export default Sentry.wrap(function App() {
  return (
    <GestureHandlerRootView style={rootStyle}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AlertProvider>
            <ToastProvider>
              <AuthProvider>
                <NotificationProvider>
                  <AppInner />
                </NotificationProvider>
              </AuthProvider>
            </ToastProvider>
          </AlertProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
});
