import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppIcon } from '../../components/ui/AppIcon';
import { Input } from '../../components/ui/Input';
import { InlineError } from '../../components/ui/InlineError';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
import type { Colors } from '../../theme';
import {
  cancelDeletion,
  getDeletionStatus,
  requestDeletion,
  type AccountDeletionStatus,
} from '../../../infra/account/account-deletion-api';

const REQUIRED_PHRASE = 'DELETE';
const COOLING_OFF_DAYS = 30;

export function DeleteAccountScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [pending, setPending] = useState<AccountDeletionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [password, setPassword] = useState('');
  const [phrase, setPhrase] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isOwner = user?.role === 'OWNER';

  const refresh = useCallback(async () => {
    setLoadingStatus(true);
    const result = await getDeletionStatus();
    if (result.ok) setPending(result.value);
    setLoadingStatus(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onSubmit = useCallback(async () => {
    setServerError(null);
    setFieldErrors({});

    const errs: Record<string, string> = {};
    if (password.length < 8) errs['password'] = 'Enter your current password to confirm.';
    if (phrase.trim().toUpperCase() !== REQUIRED_PHRASE) {
      errs['phrase'] = `Type "${REQUIRED_PHRASE}" exactly to confirm.`;
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    const result = await requestDeletion({
      password,
      confirmationPhrase: phrase.trim().toUpperCase(),
      reason: reason.trim() || null,
    });
    setSubmitting(false);

    if (result.ok) {
      showToast('Account deletion scheduled');
      setPending(result.value);
      setPassword('');
      setPhrase('');
      setReason('');
    } else {
      const code = result.error.code;
      if (code === 'UNAUTHORIZED') setFieldErrors({ password: result.error.message });
      else setServerError(result.error.message);
    }
  }, [password, phrase, reason, showToast]);

  const onCancel = useCallback(async () => {
    setSubmitting(true);
    const result = await cancelDeletion();
    setSubmitting(false);
    if (result.ok) {
      showToast('Deletion canceled');
      setPending(null);
    } else {
      setServerError(result.error.message);
    }
  }, [showToast]);

  if (loadingStatus) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isOwner) {
    return (
      <View style={styles.center}>
        <Text style={styles.notAllowed}>
          Account deletion is only available to academy owners.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pending ? (
        <View style={styles.pendingCard}>
          <View style={styles.pendingHeader}>
            <AppIcon name="clock-alert-outline" size={20} color={colors.warning} />
            <Text style={styles.pendingTitle}>Deletion scheduled</Text>
          </View>
          <Text style={styles.pendingBody}>
            Your academy is scheduled to be permanently deleted on{' '}
            <Text style={styles.pendingBold}>
              {new Date(pending.scheduledExecutionAt).toLocaleString()}
            </Text>
            . You can cancel anytime before that date.
          </Text>
          {pending.reason ? (
            <Text style={styles.pendingBody}>Reason: {pending.reason}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={onCancel}
            disabled={submitting}
          >
            <LinearGradient
              colors={[gradient.start, gradient.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.btnPrimaryText}>
              {submitting ? 'Canceling…' : 'Cancel deletion'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnGhost]}
            onPress={() => logout()}
          >
            <Text style={styles.btnGhostText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.warningCard}>
            <View style={styles.warningIconCircle}>
              <AppIcon name="alert-octagon" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.warningTitle}>Delete this academy</Text>
            <Text style={styles.warningBody}>
              Everything below will be removed after a {COOLING_OFF_DAYS}-day
              cooling-off period. After that, the deletion cannot be undone.
            </Text>

            {/* What gets deleted — semantic icons, not plain dots */}
            <View style={styles.consequenceList}>
              {[
                { icon: 'account-multiple-remove-outline', text: 'All staff, students, parents and their logins' },
                { icon: 'database-remove-outline', text: 'All attendance, fee and expense records' },
                { icon: 'image-broken-variant', text: 'All batches, events, enquiries and gallery photos' },
                { icon: 'credit-card-off-outline', text: 'Your active subscription is canceled' },
              ].map((row) => (
                <View key={row.text} style={styles.consequenceRow}>
                  <View style={styles.consequenceIconWrap}>
                    <AppIcon name={row.icon} size={14} color={colors.danger} />
                  </View>
                  <Text style={styles.consequenceText}>{row.text}</Text>
                </View>
              ))}
            </View>

            {/* What's preserved — distinct positive callout */}
            <View style={styles.preservedCallout}>
              <AppIcon name="shield-check-outline" size={16} color={colors.success} />
              <Text style={styles.preservedText}>
                Audit logs and payment receipts are kept for legal compliance.
              </Text>
            </View>

            {/* The cooling-off note — visually tied to the action so it's not lost */}
            <View style={styles.coolingCallout}>
              <AppIcon name="clock-outline" size={14} color={colors.warning} />
              <Text style={styles.coolingText}>
                You have {COOLING_OFF_DAYS} days to cancel after submitting.
              </Text>
            </View>
          </View>

          {serverError && <InlineError message={serverError} />}

          <Input
            label="Current password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={fieldErrors['password']}
            placeholder="Re-enter your password"
            testID="delete-account-password"
          />

          <Input
            label={`Type "${REQUIRED_PHRASE}" to confirm`}
            value={phrase}
            onChangeText={setPhrase}
            error={fieldErrors['phrase']}
            autoCapitalize="characters"
            placeholder={REQUIRED_PHRASE}
            testID="delete-account-phrase"
          />

          <Input
            label="Reason (optional)"
            value={reason}
            onChangeText={setReason}
            placeholder="Help us improve — what made you decide?"
            maxLength={500}
            testID="delete-account-reason"
          />

          <TouchableOpacity
            style={[styles.btn, styles.btnDanger, submitting && styles.btnDisabled]}
            onPress={onSubmit}
            disabled={submitting}
            activeOpacity={0.85}
            testID="delete-account-submit"
          >
            <AppIcon
              name={submitting ? 'progress-clock' : 'trash-can-outline'}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.btnDangerText}>
              {submitting ? 'Submitting…' : `Schedule deletion · ${COOLING_OFF_DAYS}-day cooling-off`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnGhost]}
            onPress={() => navigation.goBack()}
            disabled={submitting}
          >
            <Text style={styles.btnGhostText}>Keep my academy</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.base,
      backgroundColor: colors.bg,
    },
    notAllowed: {
      fontSize: fontSizes.base,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    content: {
      padding: spacing.base,
      paddingBottom: spacing['3xl'],
      backgroundColor: colors.bg,
      flexGrow: 1,
    },
    warningCard: {
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderColor: colors.dangerBorder,
      borderWidth: 1,
      borderRadius: radius.xl,
      marginBottom: spacing.base,
      alignItems: 'center',
    },
    warningIconCircle: {
      width: 64,
      height: 64,
      borderRadius: radius.full,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
      shadowColor: colors.danger,
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    warningTitle: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: spacing.sm,
      letterSpacing: -0.3,
    },
    warningBody: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    consequenceList: {
      alignSelf: 'stretch',
      backgroundColor: colors.dangerBg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      padding: spacing.md,
      gap: spacing.sm + 2,
    },
    consequenceRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    consequenceIconWrap: {
      width: 24,
      height: 24,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    consequenceText: {
      flex: 1,
      fontSize: fontSizes.sm,
      color: colors.text,
      lineHeight: 18,
      paddingTop: 2,
    },
    preservedCallout: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
      padding: spacing.sm + 2,
      borderRadius: radius.md,
      backgroundColor: colors.successBg,
      borderWidth: 1,
      borderColor: colors.successBorder,
    },
    preservedText: {
      flex: 1,
      fontSize: 12,
      color: colors.successText,
      lineHeight: 16,
    },
    coolingCallout: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs + 2,
    },
    coolingText: {
      flex: 1,
      fontSize: 11,
      color: colors.warning,
      fontWeight: fontWeights.semibold,
      letterSpacing: 0.2,
    },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: 14,
      borderRadius: radius.lg,
      marginTop: spacing.base,
    },
    btnDanger: {
      backgroundColor: colors.danger,
      shadowColor: colors.danger,
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    btnDangerText: {
      color: '#FFFFFF',
      fontSize: fontSizes.base,
      fontWeight: fontWeights.bold,
      letterSpacing: 0.2,
    },
    btnPrimary: { overflow: 'hidden' },
    btnPrimaryText: {
      color: colors.white,
      fontSize: fontSizes.base,
      fontWeight: fontWeights.semibold,
    },
    btnGhost: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    btnGhostText: {
      color: colors.text,
      fontSize: fontSizes.base,
      fontWeight: fontWeights.medium,
    },
    btnDisabled: { opacity: 0.5 },
    pendingCard: {
      padding: spacing.base,
      backgroundColor: colors.warningBg,
      borderColor: colors.warningBorder,
      borderWidth: 1,
      borderRadius: radius.lg,
    },
    pendingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    pendingTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.warningText,
    },
    pendingBody: {
      fontSize: fontSizes.base,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    pendingBold: {
      fontWeight: fontWeights.semibold,
    },
  });
