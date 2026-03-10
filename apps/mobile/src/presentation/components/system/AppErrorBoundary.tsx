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
 * Placeholder error capture function.
 * Replace with Sentry.captureException or similar when a provider is configured.
 */
export function captureError(_error: unknown, _context?: Record<string, unknown>): void {
  // No-op: placeholder for future error tracking integration
}
