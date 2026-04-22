import React, { Component, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { AppIcon } from '../ui/AppIcon';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  errorId: string | null;
};

function generateErrorId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ERR-${ts}-${rand}`;
}

type FallbackProps = {
  errorId: string;
  onRetry: () => void;
};

function ErrorFallback({ errorId, onRetry }: FallbackProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handleCopy = () => {
    // Best-effort copy — web uses the native clipboard API; native falls
    // through silently (users can long-press the field to select).
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(errorId).catch(() => {});
    }
  };

  const handleReport = () => {
    const subject = encodeURIComponent(`Academyflo crash report — ${errorId}`);
    const body = encodeURIComponent(`Error ID: ${errorId}\n\nWhat were you doing when this happened?\n\n`);
    Linking.openURL(`mailto:support@academyflo.com?subject=${subject}&body=${body}`).catch(() => {
      // Ignore — mail client may not be configured.
    });
  };

  return (
    <SafeAreaView style={styles.container} testID="app-error-boundary">
      <View style={styles.body}>
        <View style={styles.iconTile}>
          <AppIcon name="alert-outline" size={36} color={colors.dangerText} />
        </View>

        <Text style={styles.title} accessibilityRole="header">
          Something broke
        </Text>
        <Text style={styles.subtitle}>
          The app hit an unexpected error. Restart to get back in — if it keeps happening, send us
          the error ID below.
        </Text>

        <TouchableOpacity
          onPress={handleCopy}
          activeOpacity={0.7}
          style={styles.errorCard}
          accessibilityRole="button"
          accessibilityLabel={`Copy error ID ${errorId}`}
          testID="error-id-copy"
        >
          <View style={styles.errorCardText}>
            <Text style={styles.errorCardLabel}>Error ID</Text>
            <Text style={styles.errorCardValue} numberOfLines={1}>
              {errorId}
            </Text>
          </View>
          <AppIcon name="content-copy" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onRetry}
          testID="error-retry"
          accessibilityRole="button"
          accessibilityLabel="Restart app"
          style={styles.ctaWrap}
        >
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <AppIcon name="restart" size={20} color="#FFFFFF" />
            <Text style={styles.ctaText}>Restart app</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleReport}
          testID="error-report"
          accessibilityRole="button"
          accessibilityLabel="Report to support"
          style={styles.linkBtn}
        >
          <Text style={styles.linkText}>Report to support</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/**
 * Placeholder error boundary for crash reporting.
 * Replace captureError with a real provider (e.g., Sentry) when ready.
 */
export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, errorId: null };

  static getDerivedStateFromError(): State {
    return { hasError: true, errorId: generateErrorId() };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    captureError(error, {
      errorId: this.state.errorId,
      componentStack: info.componentStack ?? undefined,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorId: null });
  };

  override render() {
    if (this.state.hasError && this.state.errorId) {
      return <ErrorFallback errorId={this.state.errorId} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: spacing.xl,
    },
    body: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: spacing['3xl'],
    },
    iconTile: {
      width: 96,
      height: 96,
      borderRadius: 24,
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: 28,
      fontWeight: fontWeights.bold,
      color: colors.text,
      textAlign: 'center',
      letterSpacing: -0.6,
      marginBottom: spacing.md,
    },
    subtitle: {
      fontSize: fontSizes.md,
      color: colors.textMedium,
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 320,
      marginBottom: spacing.xl,
    },
    errorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    errorCardText: {
      flex: 1,
    },
    errorCardLabel: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    errorCardValue: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    footer: {
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    ctaWrap: {
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadows.lg,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: 16,
    },
    ctaText: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.semibold,
      color: '#FFFFFF',
      letterSpacing: -0.2,
    },
    linkBtn: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    linkText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: colors.textMedium,
    },
  });

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
