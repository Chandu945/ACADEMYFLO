import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../ui/Button';
import type { PaymentFlowStatus } from '../../../domain/payments/cashfree.types';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
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
    <View style={styles.container} testID="pay-cashfree-section">
      <Text style={styles.label}>
        Subscribe to {tierLabel} — ₹{amountInr}/month
      </Text>
      {isFailed ? (
        <Button
          title="Try Again"
          variant="primary"
          onPress={onRetry}
          testID="pay-retry-button"
        />
      ) : (
        <Button
          title="Pay with Cashfree"
          variant="primary"
          onPress={onPress}
          loading={isLoading}
          disabled={isLoading}
          testID="pay-cashfree-button"
        />
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  label: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.textDark,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
