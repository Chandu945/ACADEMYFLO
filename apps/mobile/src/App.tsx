import React from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { AuthProvider } from './presentation/context/AuthContext';
import { NotificationProvider } from './presentation/context/NotificationContext';
import { ThemeProvider, useTheme } from './presentation/context/ThemeContext';
import { ToastProvider } from './presentation/context/ToastContext';
import { AlertProvider } from './presentation/context/AlertContext';
import { RootNavigator } from './presentation/navigation/RootNavigator';
import { AppErrorBoundary } from './presentation/components/system/AppErrorBoundary';
import { OfflineBanner } from './presentation/components/global/OfflineBanner';

/**
 * Deep linking configuration for Academyflo.
 * Expand the `screens` map as new linkable routes are added.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const linking: any = {
  prefixes: ['playconnect://', 'https://playconnect.app'],
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

export default function App() {
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
}
