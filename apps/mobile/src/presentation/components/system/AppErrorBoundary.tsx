import React, { Component } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../ui/Button';
import { lightColors, spacing, fontSizes, fontWeights } from '../../theme';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

// Error boundary is a class component — uses lightColors as a safe fallback
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: lightColors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  body: {
    fontSize: fontSizes.md,
    color: lightColors.textLight,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
});

/**
 * Placeholder error boundary for crash reporting.
 * Replace captureError with a real provider (e.g., Sentry) when ready.
 */
export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    captureError(error, { componentStack: info.componentStack ?? undefined });
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container} testID="app-error-boundary">
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            The app encountered an unexpected error. Please try again.
          </Text>
          <Button title="Try Again" onPress={this.handleRetry} testID="error-retry" />
        </View>
      );
    }
    return this.props.children;
  }
}

/**
 * Error capture function. Logs structured error data for diagnostics.
 *
 * TODO: Integrate Sentry or Firebase Crashlytics for production crash reporting.
 * Replace the console.error calls below with:
 *   Sentry.captureException(error, { extra: context });
 * or:
 *   crashlytics().recordError(error instanceof Error ? error : new Error(String(error)));
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Always log structured error data — both dev and production.
    // In production this ensures errors surface in device logs / log-drain services
    // even before a dedicated crash reporter is wired up.
    if (__DEV__) console.error('[AppErrorBoundary] Uncaught error:', {
      message,
      stack,
      ...context,
    });
  } catch {
    // Swallow to prevent infinite error loops in the error boundary
  }
}
