import React, { useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { crossAlert } from '../../utils/crossPlatformAlert';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp, NavigationProp } from '@react-navigation/native';
import type { ParentFeesStackParamList } from '../../navigation/ParentFeesStack';
import { AppIcon } from '../../components/ui/AppIcon';
import { useFeePaymentFlow } from '../../../application/parent/use-fee-payment-flow';
import { parentApi } from '../../../infra/parent/parent-api';
import { openCashfreeCheckout } from '../../../infra/payments/cashfree-web-checkout';
import LinearGradient from 'react-native-linear-gradient';

const feePaymentDeps = {
  parentApi,
  checkout: { openCheckout: openCashfreeCheckout },
};
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { formatMonthKey, formatCurrency } from '../../utils/format';
import { CONVENIENCE_FEE_RATE } from '@academyflo/contracts';
import { useTheme } from '../../context/ThemeContext';

type FeePaymentRouteParams = {
  FeePayment: { feeDueId: string; monthKey: string; amount: number; lateFee?: number };
};

function StepIndicator({
  step,
  currentStep,
  label,
}: {
  step: number;
  currentStep: number;
  label: string;
}) {
  const { colors } = useTheme();
  const sStyles = useMemo(() => makeStepStyles(colors), [colors]);
  const isActive = step <= currentStep;
  const isCurrent = step === currentStep;
  return (
    <View style={sStyles.container}>
      <View
        style={[
          sStyles.dot,
          isActive && sStyles.dotActive,
          isCurrent && sStyles.dotCurrent,
        ]}
      >
        {isActive ? (
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {isActive && (

          <AppIcon name="check" size={12} color={colors.white} />
        )}
      </View>
      <Text style={[sStyles.label, isActive && { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const makeStepStyles = (colors: Colors) => StyleSheet.create({
  container: { alignItems: 'center', flex: 1 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    overflow: 'hidden',
  },
  dotCurrent: {
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  label: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export function FeePaymentScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute<RouteProp<FeePaymentRouteParams, 'FeePayment'>>();
  const navigation = useNavigation<NavigationProp<ParentFeesStackParamList>>();
  const feeDueId = route.params?.feeDueId ?? '';
  const monthKey = route.params?.monthKey ?? '';
  const feeAmount = route.params?.amount ?? 0;
  const lateFee = route.params?.lateFee ?? 0;
  const baseAmount = feeAmount + lateFee;
  const convenienceFee = Math.round(baseAmount * CONVENIENCE_FEE_RATE);
  const totalAmount = baseAmount + convenienceFee;

  const { status, error, errorCode, startPayment, reset } = useFeePaymentFlow(feePaymentDeps, () => {
    // Don't navigate away — let user see success state and receipt button.
    // User taps "Done" to dismiss.
  });

  const isFeatureDisabled = errorCode === 'FEATURE_DISABLED';

  const isProcessing = status === 'initiating' || status === 'checkout' || status === 'polling';

  // Prevent accidental back navigation during payment processing
  useEffect(() => {
    if (!isProcessing) return;
    const unsubscribe = navigation.addListener('beforeRemove', (e: { preventDefault: () => void; data: { action: any } }) => {
      e.preventDefault();
      crossAlert(
        'Payment in Progress',
        'A payment is being processed. Leaving now may result in missed confirmation. Are you sure?',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      );
    });
    return unsubscribe;
  }, [isProcessing, navigation]);
  const currentStep =
    status === 'initiating' ? 1 : status === 'checkout' ? 2 : status === 'polling' ? 3 : 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="receipt" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.summaryDetails}>
          <Text style={styles.summaryLabel}>Fee Payment</Text>
          <Text style={styles.summaryMonth}>{formatMonthKey(monthKey)}</Text>
        </View>
        <View style={styles.summaryAmountContainer}>
          <Text style={styles.summaryAmountLabel}>Total Payable</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(totalAmount)}</Text>
        </View>
      </View>

      {/* Late Fee Info Banner */}
      {lateFee > 0 && (
        <View style={styles.lateFeeInfoBanner}>
          
          <AppIcon name="information-outline" size={18} color={colors.danger} />
          <Text style={styles.lateFeeInfoText}>
            A late fee of {formatCurrency(lateFee)} has been applied because this fee was not paid by the due date.
          </Text>
        </View>
      )}

      {/* Fee Breakdown */}
      <View style={styles.breakdownCard}>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Fee Amount</Text>
          <Text style={styles.breakdownValue}>{formatCurrency(feeAmount)}</Text>
        </View>
        {lateFee > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.danger }]}>Late Fee</Text>
            <Text style={[styles.breakdownValue, { color: colors.danger }]}>{formatCurrency(lateFee)}</Text>
          </View>
        )}
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Convenience Fee ({(CONVENIENCE_FEE_RATE * 100).toFixed(1)}%)</Text>
          <Text style={styles.breakdownValue}>{formatCurrency(convenienceFee)}</Text>
        </View>
        <View style={styles.breakdownDivider} />
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownTotalLabel}>Total Payable</Text>
          <Text style={styles.breakdownTotalValue}>{formatCurrency(totalAmount)}</Text>
        </View>
      </View>

      {/* Steps (shown during processing) */}
      {isProcessing && (
        <View style={styles.stepsContainer}>
          <View style={styles.stepsRow}>
            <StepIndicator step={1} currentStep={currentStep} label="Initiate" />
            <View style={styles.stepLine} />
            <StepIndicator step={2} currentStep={currentStep} label="Payment" />
            <View style={styles.stepLine} />
            <StepIndicator step={3} currentStep={currentStep} label="Verify" />
          </View>
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.processingSpinner}
          />
          <Text style={styles.processingText}>
            {status === 'initiating'
              ? 'Setting up your payment...'
              : status === 'checkout'
                ? 'Complete payment in the browser...'
                : 'Verifying your payment...'}
          </Text>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.statusCard}>
          <AppIcon
            name={isFeatureDisabled ? 'information-outline' : 'close-circle'}
            size={48}
            color={isFeatureDisabled ? colors.warning : colors.danger}
          />
          <Text
            style={[
              styles.statusTitle,
              isFeatureDisabled && { color: colors.warning },
            ]}
          >
            {isFeatureDisabled ? 'Online Payment Unavailable' : 'Payment Failed'}
          </Text>
          <Text style={styles.statusMessage}>{error}</Text>
        </View>
      )}

      {/* Success */}
      {status === 'success' && (
        <View style={styles.statusCard}>
          
          <AppIcon name="check-circle" size={48} color={colors.success} />
          <Text style={[styles.statusTitle, { color: colors.success }]}>
            Payment Successful!
          </Text>
          <Text style={styles.statusMessage}>
            Your fee for {formatMonthKey(monthKey)} has been paid successfully.
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {!isProcessing && status !== 'success' && !isFeatureDisabled && (
          <TouchableOpacity
            style={[styles.payButton, isProcessing && { opacity: 0.5 }]}
            activeOpacity={0.8}
            onPress={() => startPayment(feeDueId)}
            disabled={isProcessing}
          >
            <LinearGradient
              colors={[gradient.start, gradient.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <AppIcon name="shield-check-outline" size={20} color={colors.white} />
            <Text style={styles.payButtonText}>
              {status === 'failed' ? 'Retry Payment' : 'Pay Securely'}
            </Text>
          </TouchableOpacity>
        )}

        {status === 'success' && (
          <>
            <TouchableOpacity
              style={styles.receiptButton}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Receipt', { feeDueId })}
            >
              
              <AppIcon name="receipt" size={20} color={colors.textSecondary} />
              <Text style={styles.receiptButtonText}>View Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneButton} onPress={() => { reset(); navigation.goBack(); }}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Secure badge */}
      {!isProcessing && status !== 'success' && status !== 'failed' && (
        <View style={styles.secureBadge}>

          <AppIcon name="lock-outline" size={14} color={colors.textDisabled} />
          <Text style={styles.secureText}>Secured by Cashfree</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, padding: spacing.base, backgroundColor: colors.bg },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    ...shadows.md,
    marginBottom: spacing.lg,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  summaryDetails: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  summaryMonth: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  summaryAmountContainer: {
    alignItems: 'flex-end',
  },
  summaryAmountLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  summaryAmount: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  lateFeeInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  lateFeeInfoText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.dangerText,
    lineHeight: 18,
  },
  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    ...shadows.sm,
    marginBottom: spacing.lg,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  breakdownLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  breakdownTotalLabel: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  breakdownTotalValue: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  stepsContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.sm,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  processingSpinner: {
    marginBottom: spacing.md,
  },
  processingText: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.sm,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  statusMessage: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: spacing.lg,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
    borderRadius: radius.xl,
    paddingVertical: spacing.base,
    ...shadows.md,
  },
  payButtonText: {
    color: colors.white,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.xl,
    paddingVertical: spacing.base,
    marginBottom: spacing.sm,
  },
  receiptButtonText: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
  },
  doneButton: {
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: radius.xl,
    paddingVertical: spacing.base,
  },
  doneButtonText: {
    color: colors.white,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  secureText: {
    fontSize: fontSizes.sm,
    color: colors.textDisabled,
  },
});
