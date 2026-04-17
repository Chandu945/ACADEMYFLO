import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { PaymentFlowStatus } from '../../../domain/payments/cashfree.types';
import { AppIcon } from '../ui/AppIcon';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  status: PaymentFlowStatus;
  error: string | null;
};

export function PaymentStatusBanner({ status, error }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (status === 'idle') return null;

  // Processing states (initiating, checkout, polling)
  if (status === 'initiating' || status === 'checkout' || status === 'polling') {
    const message =
      status === 'initiating' ? 'Preparing your payment...' :
      status === 'checkout' ? 'Complete payment in the browser...' :
      'Verifying your payment...';
    const step =
      status === 'initiating' ? 1 :
      status === 'checkout' ? 2 : 3;

    return (
      <View style={styles.processingCard} testID="payment-status-banner">
        <View style={styles.stepsRow}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.stepContainer}>
              <View style={[
                styles.stepCircle,
                s < step && styles.stepDone,
                s === step && styles.stepActive,
                s > step && styles.stepPending,
              ]}>
                {s < step ? (
                  <AppIcon name="check" size={14} color={colors.white} />
                ) : s === step ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.stepNum}>{s}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, s === step && styles.stepLabelActive]}>
                {s === 1 ? 'Prepare' : s === 2 ? 'Pay' : 'Verify'}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.processingText}>{message}</Text>
      </View>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <View style={styles.successCard} testID="payment-status-banner">
        <View style={styles.successIconCircle}>
          <AppIcon name="check-circle" size={48} color={colors.success} />
        </View>
        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successSubtitle}>Your subscription is now active.</Text>
      </View>
    );
  }

  // Failed state
  if (status === 'failed') {
    return (
      <View style={styles.failedCard} testID="payment-status-banner">
        <View style={styles.failedIconCircle}>
          <AppIcon name="close-circle" size={48} color={colors.danger} />
        </View>
        <Text style={styles.failedTitle}>Payment Failed</Text>
        <Text style={styles.failedSubtitle}>
          {error || 'Something went wrong. Please try again.'}
        </Text>
      </View>
    );
  }

  return null;
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  processingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    alignItems: 'center',
    ...shadows.sm,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: spacing.xl + spacing.lg,
    marginBottom: spacing.lg,
  },
  stepContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: {
    backgroundColor: colors.success,
  },
  stepActive: {
    backgroundColor: colors.primary,
  },
  stepPending: {
    backgroundColor: colors.bgSubtle,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  stepNum: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  stepLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },
  processingText: {
    fontSize: fontSizes.base,
    color: colors.primary,
    fontWeight: fontWeights.medium,
    textAlign: 'center',
  },

  successCard: {
    backgroundColor: colors.successBg,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  successIconCircle: {
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  successSubtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  failedCard: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger + '30',
  },
  failedIconCircle: {
    marginBottom: spacing.md,
  },
  failedTitle: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  failedSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
