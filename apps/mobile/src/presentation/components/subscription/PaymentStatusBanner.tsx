import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { PaymentFlowStatus } from '../../../domain/payments/cashfree.types';
import { Badge } from '../ui/Badge';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
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

  return (
    <View style={styles.banner} testID="payment-status-banner">
      {status === 'initiating' && (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.text}>Initiating payment...</Text>
        </View>
      )}

      {status === 'checkout' && (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.text}>Opening payment page...</Text>
        </View>
      )}

      {status === 'polling' && (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.text}>Verifying payment...</Text>
        </View>
      )}

      {status === 'success' && (
        <View style={styles.row}>
          <Badge label="Paid" variant="success" />
          <Text style={styles.successText}>Subscription activated!</Text>
        </View>
      )}

      {status === 'failed' && (
        <View>
          <View style={styles.row}>
            <Badge label="Failed" variant="danger" />
            <Text style={styles.errorText}>{error ?? 'Payment failed'}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  banner: {
    backgroundColor: colors.infoBg,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: {
    fontSize: fontSizes.base,
    color: colors.primaryHover,
  },
  successText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.success,
  },
  errorText: {
    fontSize: fontSizes.base,
    color: colors.dangerText,
    flex: 1,
  },
});
