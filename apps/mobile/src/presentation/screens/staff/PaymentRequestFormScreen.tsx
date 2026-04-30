import React, { useState, useCallback, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { FeesStackParamList } from '../../navigation/FeesStack';
import {
  validatePaymentRequestForm,
  staffCreatePaymentRequestUseCase,
} from '../../../application/fees/use-cases/staff-create-payment-request.usecase';
import { staffEditPaymentRequestUseCase } from '../../../application/fees/use-cases/staff-edit-payment-request.usecase';
import { createPaymentRequest, editPaymentRequest } from '../../../infra/fees/payment-requests-api';
import { TextArea } from '../../components/ui/TextArea';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/InlineError';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

type Route = RouteProp<FeesStackParamList, 'PaymentRequestForm'>;

const requestsApi = { createPaymentRequest, editPaymentRequest };

function formatCurrency(n: number): string {
  return `\u20B9${n.toLocaleString('en-IN')}`;
}

export function PaymentRequestFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const studentId = route.params?.studentId ?? '';
  const monthKey = route.params?.monthKey ?? '';
  const amount = route.params?.amount ?? 0;
  const requestId = route.params?.requestId;
  const existingNotes = route.params?.existingNotes;
  const isEditMode = !!requestId;

  const [staffNotes, setStaffNotes] = useState(existingNotes ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleNotesChange = useCallback((text: string) => {
    setStaffNotes(text);
    if (fieldErrors['staffNotes']) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next['staffNotes'];
        return next;
      });
    }
    if (serverError) setServerError(null);
  }, [fieldErrors, serverError]);

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();
    const errors = validatePaymentRequestForm({ staffNotes });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setServerError(null);
    setSubmitting(true);

    try {
      const result = isEditMode
        ? await staffEditPaymentRequestUseCase(
            { paymentRequestsApi: requestsApi },
            requestId,
            { staffNotes: staffNotes.trim() },
          )
        : await staffCreatePaymentRequestUseCase(
            { paymentRequestsApi: requestsApi },
            { studentId, monthKey, staffNotes: staffNotes.trim() },
          );

      if (result.ok) {
        showToast(isEditMode ? 'Request updated successfully' : 'Request submitted successfully');
        (navigation as any).navigate('FeesHome');
        return;
      } else {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        }
        setServerError(result.error.message);
      }
    } catch (e) {
      if (__DEV__) console.error('[PaymentRequestFormScreen] Submit failed:', e);
      setServerError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [staffNotes, studentId, monthKey, navigation, isEditMode, requestId, showToast]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {serverError && <InlineError message={serverError} />}

      <View style={styles.infoRow}>
        <Text style={styles.label}>Month</Text>
        <Text style={styles.value}>{monthKey}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Amount</Text>
        <Text style={styles.value}>{formatCurrency(amount)}</Text>
      </View>

      <TextArea
        label="Collection Notes (how was fee collected?)"
        value={staffNotes}
        onChangeText={handleNotesChange}
        placeholder="e.g. Collected cash from guardian at academy"
        error={fieldErrors['staffNotes']}
        testID="input-staffNotes"
      />

      <View style={styles.submitContainer}>
        <Button
          title={submitting ? (isEditMode ? 'Updating...' : 'Submitting...') : (isEditMode ? 'Update Request' : 'Submit Request')}
          onPress={handleSubmit}
          loading={submitting}
          testID="submit-button"
        />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.base,
    paddingBottom: 40,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  label: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  value: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  submitContainer: {
    marginTop: spacing.sm,
  },
});
