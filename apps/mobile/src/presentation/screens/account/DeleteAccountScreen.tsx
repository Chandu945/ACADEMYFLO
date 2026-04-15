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
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
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
            <AppIcon name="alert-circle-outline" size={20} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Delete this academy</Text>
              <Text style={styles.warningBody}>
                This permanently removes your academy and everything in it after a{' '}
                {COOLING_OFF_DAYS}-day cooling-off period. This action cannot be undone
                once the period elapses.
              </Text>
              {[
                'All staff, students, parents and their logins are removed',
                'All attendance, fee and expense records are deleted',
                'All batches, events, enquiries and gallery photos are deleted',
                'Your active subscription is canceled',
                'Audit logs and payment receipts are retained for legal compliance',
              ].map((b) => (
                <Text key={b} style={styles.bullet}>• {b}</Text>
              ))}
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
            testID="delete-account-submit"
          >
            <Text style={styles.btnDangerText}>
              {submitting ? 'Submitting…' : `Schedule deletion (${COOLING_OFF_DAYS}-day cooling-off)`}
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
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.base,
      backgroundColor: colors.dangerBg,
      borderColor: colors.dangerBorder,
      borderWidth: 1,
      borderRadius: radius.lg,
      marginBottom: spacing.base,
    },
    warningTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.dangerText,
      marginBottom: 4,
    },
    warningBody: {
      fontSize: fontSizes.base,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    bullet: {
      fontSize: fontSizes.base,
      color: colors.textMedium,
      marginTop: 2,
    },
    btn: {
      paddingVertical: 14,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.base,
    },
    btnDanger: { backgroundColor: colors.danger },
    btnDangerText: {
      color: colors.white,
      fontSize: fontSizes.base,
      fontWeight: fontWeights.semibold,
    },
    btnPrimary: { backgroundColor: colors.primary },
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
