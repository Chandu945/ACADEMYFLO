import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, Keyboard, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { FeesStackParamList } from '../../navigation/FeesStack';
import {
  validatePaymentRequestForm,
  staffCreatePaymentRequestUseCase,
} from '../../../application/fees/use-cases/staff-create-payment-request.usecase';
import { staffEditPaymentRequestUseCase } from '../../../application/fees/use-cases/staff-edit-payment-request.usecase';
import { listPaymentRequestsUseCase } from '../../../application/fees/use-cases/list-payment-requests.usecase';
import {
  createPaymentRequest,
  editPaymentRequest,
  listPaymentRequests,
} from '../../../infra/fees/payment-requests-api';
import type { PaymentRequestItem } from '../../../domain/fees/payment-requests.types';
import { TextArea } from '../../components/ui/TextArea';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/InlineError';
import { AppIcon } from '../../components/ui/AppIcon';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { spacing, fontSizes, fontWeights, radius, shadows, letterSpacing } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatMonthKey, formatTimeAgo } from '../../utils/format';

type Route = RouteProp<FeesStackParamList, 'PaymentRequestForm'>;

const requestsApi = { createPaymentRequest, editPaymentRequest, listPaymentRequests };

/** Heuristic — the backend rejects duplicate-pending submissions with a
 * domain error whose code or message is stable enough to detect client-side
 * without coupling to the exact constant. We use this to swap the generic
 * server message for a more actionable one with a "View My Requests" CTA. */
function isDuplicatePendingError(err: { code?: string; message: string }): boolean {
  if (err.code === 'DUPLICATE_PENDING' || err.code === 'CONFLICT') return true;
  return /already.*(pending|review|submitted|exists)/i.test(err.message);
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
  const baseAmount = route.params?.baseAmount;
  const lateFee = route.params?.lateFee ?? 0;
  const studentName = route.params?.studentName;
  const requestId = route.params?.requestId;
  const existingNotes = route.params?.existingNotes;
  const isEditMode = !!requestId;

  const showBreakdown = !isEditMode && lateFee > 0 && typeof baseAmount === 'number';

  const [staffNotes, setStaffNotes] = useState(existingNotes ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const initialNotes = existingNotes ?? '';

  // Pre-flight: in create mode, check whether this staff already has an
  // in-flight request for the same (student, month). If so, swap the form
  // for a read-only "already submitted" panel — saves the staff from typing
  // notes that would be rejected anyway. The screen-level check on
  // StudentFeeDetail catches the same case earlier; this is a safety net
  // for deep-links and stale navigations.
  const [existingPending, setExistingPending] = useState<PaymentRequestItem | null>(null);
  const [preflightChecking, setPreflightChecking] = useState(!isEditMode);
  const [crossStaffDuplicate, setCrossStaffDuplicate] = useState(false);

  useEffect(() => {
    if (isEditMode) return;
    let active = true;
    // Pass studentId so the endpoint returns ALL pending requests for this
    // student (not just the caller's own) — catches the case where a
    // parent or another staff already submitted for the same month.
    listPaymentRequestsUseCase({ paymentRequestsApi: requestsApi }, 'PENDING', studentId)
      .then((r) => {
        if (!active) return;
        if (r.ok) {
          const match = r.value.items.find((req) => req.monthKey === monthKey);
          if (match) setExistingPending(match);
        }
        // Failure is non-fatal — the form still renders and submit-time
        // checks will catch any duplicates we missed.
      })
      .finally(() => {
        if (active) setPreflightChecking(false);
      });
    return () => {
      active = false;
    };
  }, [isEditMode, studentId, monthKey]);

  const isDirty = staffNotes !== initialNotes;
  useUnsavedChangesWarning(isDirty && !submitting && !submittedRef.current);

  const handleNotesChange = useCallback(
    (text: string) => {
      setStaffNotes(text);
      if (fieldErrors['staffNotes']) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next['staffNotes'];
          return next;
        });
      }
      if (serverError) setServerError(null);
      if (crossStaffDuplicate) setCrossStaffDuplicate(false);
    },
    [fieldErrors, serverError, crossStaffDuplicate],
  );

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();
    const errors = validatePaymentRequestForm({ staffNotes });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setServerError(null);
    setCrossStaffDuplicate(false);
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
        submittedRef.current = true;
        (navigation as any).navigate('FeesHome');
        return;
      } else {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        }
        if (!isEditMode && isDuplicatePendingError(result.error)) {
          setCrossStaffDuplicate(true);
          setServerError(null);
        } else {
          setServerError(result.error.message);
        }
      }
    } catch (e) {
      if (__DEV__) console.error('[PaymentRequestFormScreen] Submit failed:', e);
      setServerError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [staffNotes, studentId, monthKey, navigation, isEditMode, requestId, showToast]);

  // Pre-flight loading
  if (preflightChecking) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Existing pending request found — show read-only "already submitted"
  // panel instead of the form. Owner can still edit notes via Edit, or
  // close and use the Cancel action from the student detail sheet.
  if (existingPending) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.alreadyCard}>
            <View style={styles.alreadyHeader}>
              <View style={styles.alreadyIconCircle}>
                <AppIcon name="clock-outline" size={20} color={colors.warningText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alreadyTitle}>Already submitted</Text>
                <Text style={styles.alreadySubtitle}>
                  {existingPending.source === 'PARENT'
                    ? `Parent has already submitted a payment request for ${formatMonthKey(monthKey)}`
                    : `A pending request already exists for ${formatMonthKey(monthKey)}`}
                </Text>
              </View>
            </View>

            <View style={styles.alreadySummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Amount</Text>
                <Text style={styles.summaryValue}>{formatCurrency(existingPending.amount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Submitted by</Text>
                <Text style={styles.summaryValue}>
                  {existingPending.staffName ?? '—'}
                  {existingPending.source === 'PARENT' ? ' (parent)' : ''}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>When</Text>
                <Text style={styles.summaryValue}>{formatTimeAgo(existingPending.createdAt)}</Text>
              </View>
              {existingPending.staffNotes ? (
                <View style={styles.notesBlock}>
                  <Text style={styles.notesLabel}>NOTES</Text>
                  <Text style={styles.notesValue}>{existingPending.staffNotes}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.alreadyHint}>
              Wait for the owner to approve or reject this request before submitting another.
            </Text>

            <View style={styles.alreadyActions}>
              <Button
                title="Go back"
                variant="primary"
                onPress={() => navigation.goBack()}
                testID="already-pending-back"
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {crossStaffDuplicate ? (
          <View style={styles.crossStaffBanner}>
            <View style={styles.crossStaffIconWrap}>
              <AppIcon name="alert-circle-outline" size={18} color={colors.dangerText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.crossStaffTitle}>Already in review</Text>
              <Text style={styles.crossStaffText}>
                Another staff member or the parent has already submitted a request for{' '}
                {formatMonthKey(monthKey)}. Open the My Requests tab to see all pending requests.
              </Text>
            </View>
          </View>
        ) : null}

        {serverError ? <InlineError message={serverError} /> : null}

        {studentName ? (
          <View style={styles.studentContext}>
            <Text style={styles.studentContextLabel}>Payment for</Text>
            <Text style={styles.studentContextName}>{studentName}</Text>
          </View>
        ) : null}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeading}>Payment Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Month</Text>
            <Text style={styles.summaryValue}>{formatMonthKey(monthKey)}</Text>
          </View>

          {showBreakdown ? (
            <>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Base fee</Text>
                <Text style={styles.summaryValue}>{formatCurrency(baseAmount as number)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Late fee</Text>
                <Text style={[styles.summaryValue, styles.lateFeeValue]}>
                  +{formatCurrency(lateFee)}
                </Text>
              </View>
            </>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total amount</Text>
            <Text style={styles.totalValue}>{formatCurrency(amount)}</Text>
          </View>
        </View>

        <View style={styles.infoBanner}>
          <View style={styles.infoIconWrap}>
            <Text style={styles.infoIcon}>i</Text>
          </View>
          <Text style={styles.infoText}>
            {isEditMode
              ? 'Update your collection notes. The amount and month cannot be changed once a request has been created.'
              : 'This records a cash collection. Once the owner approves, the fee will be marked paid and a receipt will be issued.'}
          </Text>
        </View>

        <View style={styles.notesSection}>
          <TextArea
            label="Collection notes"
            value={staffNotes}
            onChangeText={handleNotesChange}
            placeholder="e.g. Collected cash from guardian at academy reception"
            error={fieldErrors['staffNotes']}
            testID="input-staffNotes"
          />
          <Text style={styles.notesHint}>
            Describe how the fee was collected — required, 5–500 characters.
          </Text>
        </View>

        <View style={styles.submitContainer}>
          <Button
            title={
              submitting
                ? isEditMode
                  ? 'Updating...'
                  : 'Submitting...'
                : isEditMode
                ? 'Update request'
                : 'Submit request'
            }
            onPress={handleSubmit}
            loading={submitting}
            testID="submit-button"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: spacing.base,
      paddingBottom: spacing['2xl'],
    },

    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Already-pending state
    alreadyCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    alreadyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.base,
    },
    alreadyIconCircle: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: colors.warningBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    alreadyTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      letterSpacing: -0.2,
    },
    alreadySubtitle: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    alreadySummary: {
      backgroundColor: colors.bgSubtle,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
    },
    notesBlock: {
      marginTop: spacing.sm,
    },
    notesLabel: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      letterSpacing: letterSpacing.wider,
      marginBottom: 4,
    },
    notesValue: {
      fontSize: fontSizes.sm,
      color: colors.text,
      lineHeight: 20,
    },
    alreadyHint: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: spacing.lg,
    },
    alreadyActions: {
      // Single primary button — keeps the panel decisive.
    },

    // Cross-staff duplicate banner (shown above form on submit failure)
    crossStaffBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.base,
    },
    crossStaffIconWrap: {
      marginRight: spacing.sm,
      marginTop: 1,
    },
    crossStaffTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.dangerText,
      marginBottom: 2,
    },
    crossStaffText: {
      fontSize: fontSizes.sm,
      color: colors.text,
      lineHeight: 18,
    },

    // Student context
    studentContext: {
      marginBottom: spacing.base,
      paddingHorizontal: spacing.xs,
    },
    studentContextLabel: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      letterSpacing: letterSpacing.wider,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    studentContextName: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: colors.text,
      letterSpacing: letterSpacing.tight,
    },

    // Summary card
    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      marginBottom: spacing.base,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    summaryHeading: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      letterSpacing: letterSpacing.wider,
      textTransform: 'uppercase',
      marginBottom: spacing.md,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    summaryLabel: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.normal,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    lateFeeValue: {
      color: colors.warningText,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.xs,
    },
    totalLabel: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    totalValue: {
      fontSize: fontSizes['2xl'],
      fontWeight: fontWeights.heavy,
      color: colors.text,
      letterSpacing: letterSpacing.tight,
    },

    // Info banner
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.infoBg,
      borderWidth: 1,
      borderColor: colors.infoText,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    infoIconWrap: {
      width: 20,
      height: 20,
      borderRadius: radius.full,
      backgroundColor: colors.info,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
      marginTop: 1,
    },
    infoIcon: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.bold,
      color: colors.white,
      fontStyle: 'italic',
      lineHeight: 14,
    },
    infoText: {
      flex: 1,
      fontSize: fontSizes.sm,
      lineHeight: 18,
      color: colors.text,
    },

    // Notes
    notesSection: {
      marginBottom: spacing.lg,
    },
    notesHint: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.xs,
    },

    submitContainer: {
      marginTop: spacing.sm,
    },
  });
