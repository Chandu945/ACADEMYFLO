import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useFeePaymentFlow } from '../../../application/parent/use-fee-payment-flow';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

type FeePaymentRouteParams = {
  FeePayment: { feeDueId: string; monthKey: string; amount: number };
};

export function FeePaymentScreen() {
  const route = useRoute<RouteProp<FeePaymentRouteParams, 'FeePayment'>>();
  const navigation = useNavigation();
  const { feeDueId, monthKey, amount } = route.params;

  const { status, error, startPayment, reset } = useFeePaymentFlow(() => {
    navigation.goBack();
  });

  const isProcessing = status === 'initiating' || status === 'checkout' || status === 'polling';

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.label}>Month</Text>
        <Text style={styles.value}>{monthKey}</Text>

        <Text style={[styles.label, { marginTop: spacing.md }]}>Amount</Text>
        <Text style={styles.amount}>₹{amount}</Text>
      </View>

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {status === 'success' && (
        <View style={styles.successCard}>
          <Text style={styles.successText}>Payment successful!</Text>
        </View>
      )}

      {!isProcessing && status !== 'success' && (
        <TouchableOpacity
          style={styles.payButton}
          onPress={() => startPayment(feeDueId)}
        >
          <Text style={styles.payButtonText}>Pay with Cashfree</Text>
        </TouchableOpacity>
      )}

      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.processingText}>
            {status === 'initiating'
              ? 'Initiating payment...'
              : status === 'checkout'
                ? 'Opening payment page...'
                : 'Verifying payment...'}
          </Text>
        </View>
      )}

      {(status === 'failed' || status === 'success') && (
        <TouchableOpacity style={styles.resetButton} onPress={reset}>
          <Text style={styles.resetButtonText}>
            {status === 'failed' ? 'Try Again' : 'Done'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.bg },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  value: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  amount: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  payButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  payButtonText: {
    color: '#fff',
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  processingText: {
    marginTop: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  errorCard: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.dangerText,
    fontSize: fontSizes.sm,
  },
  successCard: {
    backgroundColor: colors.successBg,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successText: {
    color: colors.successText,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    textAlign: 'center',
  },
  resetButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  resetButtonText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
  },
});
