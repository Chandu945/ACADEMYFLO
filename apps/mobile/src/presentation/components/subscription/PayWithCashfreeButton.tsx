import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { PaymentFlowStatus } from '../../../domain/payments/cashfree.types';
import { AppIcon } from '../ui/AppIcon';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  status: PaymentFlowStatus;
  tierLabel: string;
  amountInr: number;
  onPress: () => void;
  onRetry: () => void;
};

export function PayWithCashfreeButton({
  status,
  tierLabel,
  amountInr,
  onPress,
  onRetry,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isLoading = status === 'initiating' || status === 'checkout' || status === 'polling';
  const isFailed = status === 'failed';
  const isSuccess = status === 'success';

  if (isSuccess) return null;

  return (
    <View style={styles.card} testID="pay-cashfree-section">
      {/* Price summary */}
      <View style={styles.priceRow}>
        <View>
          <Text style={styles.planLabel}>{tierLabel}</Text>
          <Text style={styles.billingLabel}>Monthly subscription</Text>
        </View>
        <View style={styles.priceTag}>
          <Text style={styles.rupee}>{'\u20B9'}</Text>
          <Text style={styles.amount}>{amountInr}</Text>
          <Text style={styles.period}>/mo</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Action button */}
      {isFailed ? (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.8}
          testID="pay-retry-button"
        >
          <AppIcon name="refresh" size={18} color={colors.white} />
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.payButton, isLoading && styles.payButtonDisabled]}
          onPress={onPress}
          disabled={isLoading}
          activeOpacity={0.8}
          testID="pay-cashfree-button"
        >
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <AppIcon name="shield-check-outline" size={18} color={colors.white} />
              <Text style={styles.buttonText}>Pay Securely</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Secure badge */}
      <View style={styles.secureRow}>
        <AppIcon name="lock-outline" size={12} color={colors.textDisabled} />
        <Text style={styles.secureText}>Secured by Cashfree Payments</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planLabel: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  billingLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  rupee: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  amount: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  period: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.xl,
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning,
    borderRadius: radius.xl,
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
  },
  buttonText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.md,
  },
  secureText: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
  },
});
