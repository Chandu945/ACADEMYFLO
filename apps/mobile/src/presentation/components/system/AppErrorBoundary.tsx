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
 * Pluggable crash-reporter interface. Wire a real implementation (Sentry,
 * Crashlytics) via `setErrorReporter` during app startup. Until wired, the
 * default implementation just logs in dev and no-ops in production.
 */
export interface ErrorReporter {
  captureException(error: unknown, context?: Record<string, unknown>): void;
}

const defaultReporter: ErrorReporter = {
  captureException(error, context) {
    if (!__DEV__) return;
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('[AppErrorBoundary] Uncaught error:', { message, stack, ...context });
  },
};

let activeReporter: ErrorReporter = defaultReporter;

/**
 * Install a real crash reporter. Call once at app startup (in App.tsx) after
 * Sentry / Crashlytics has been initialized with a DSN.
 *
 * Example:
 *   import * as Sentry from '@sentry/react-native';
 *   Sentry.init({ dsn: env.SENTRY_DSN, enableInExpoDevelopment: false });
 *   setErrorReporter({
 *     captureException: (err, ctx) => Sentry.captureException(err, { extra: ctx }),
 *   });
 */
export function setErrorReporter(reporter: ErrorReporter): void {
  activeReporter = reporter;
}

/**
 * Report an error through the active crash reporter. Safe to call at any time;
 * falls back to the default (dev-only console log) when no reporter is wired.
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  try {
    activeReporter.captureException(error, context);
  } catch {
    // Swallow — never let the reporter crash the error boundary.
  }
}
