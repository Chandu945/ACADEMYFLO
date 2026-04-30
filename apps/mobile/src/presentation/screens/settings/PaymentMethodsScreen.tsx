import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { AppIcon } from '../../components/ui/AppIcon';
import { GradientSwitch } from '../../components/ui/GradientSwitch';
import { Input } from '../../components/ui/Input';
import { InlineError } from '../../components/ui/InlineError';
import { crossAlert } from '../../utils/crossPlatformAlert';
import { instituteInfoApi } from '../../../infra/settings/institute-info-api';
import { useInstituteInfo } from '../../../application/settings/use-institute-info';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_PATTERN = /^[\w.+-]+@[\w]+$/;

export function PaymentMethodsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { showToast } = useToast();
  const { info, loading, saving, error, update, refetch } = useInstituteInfo(instituteInfoApi);

  const [initialized, setInitialized] = useState(false);
  const [manualPaymentsEnabled, setManualPaymentsEnabled] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [upiHolderName, setUpiHolderName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');

  useEffect(() => {
    if (info && !initialized) {
      setManualPaymentsEnabled(info.manualPaymentsEnabled);
      setUpiId(info.upiId ?? '');
      setUpiHolderName(info.upiHolderName ?? '');
      if (info.bankDetails) {
        setAccountHolderName(info.bankDetails.accountHolderName);
        setAccountNumber(info.bankDetails.accountNumber);
        setIfscCode(info.bankDetails.ifscCode);
        setBankName(info.bankDetails.bankName);
        setBranchName(info.bankDetails.branchName);
      }
      setInitialized(true);
    }
  }, [info, initialized]);

  const isDirty =
    initialized &&
    (manualPaymentsEnabled !== (info?.manualPaymentsEnabled ?? false) ||
      upiId !== (info?.upiId ?? '') ||
      upiHolderName !== (info?.upiHolderName ?? '') ||
      accountHolderName !== (info?.bankDetails?.accountHolderName ?? '') ||
      accountNumber !== (info?.bankDetails?.accountNumber ?? '') ||
      ifscCode !== (info?.bankDetails?.ifscCode ?? '') ||
      bankName !== (info?.bankDetails?.bankName ?? '') ||
      branchName !== (info?.bankDetails?.branchName ?? ''));

  useUnsavedChangesWarning(isDirty && !saving);

  const handleSave = useCallback(async () => {
    // UPI validation (only if provided)
    const upiTrimmed = upiId.trim();
    if (upiTrimmed && !UPI_PATTERN.test(upiTrimmed)) {
      crossAlert('Validation', 'UPI ID must be in format: name@provider (e.g. 9876543210@ybl).');
      return;
    }

    // Bank validation — only if any bank field is filled, require all
    const hasBankFields =
      accountHolderName || accountNumber || ifscCode || bankName || branchName;
    if (hasBankFields) {
      const missing: string[] = [];
      if (!accountHolderName.trim()) missing.push('Account Holder Name');
      if (!accountNumber.trim()) missing.push('Account Number');
      if (!ifscCode.trim()) missing.push('IFSC Code');
      if (!bankName.trim()) missing.push('Bank Name');
      if (!branchName.trim()) missing.push('Branch Name');
      if (missing.length > 0) {
        crossAlert('Validation', `Please fill in: ${missing.join(', ')}`);
        return;
      }
      if (!IFSC_PATTERN.test(ifscCode.trim().toUpperCase())) {
        crossAlert('Validation', 'IFSC Code must be 11 chars (e.g. SBIN0001234).');
        return;
      }
      if (!/^\d{9,18}$/.test(accountNumber.trim())) {
        crossAlert('Validation', 'Account number must be 9\u201318 digits.');
        return;
      }
    }

    // Warn if enabling but no method is configured
    if (manualPaymentsEnabled && !upiTrimmed && !hasBankFields) {
      crossAlert(
        'No payment method set',
        'Add at least one method (UPI or bank details) before enabling manual payments.',
      );
      return;
    }

    const bankDetails = hasBankFields
      ? {
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          bankName: bankName.trim(),
          branchName: branchName.trim(),
        }
      : null;

    const errResult = await update({
      manualPaymentsEnabled,
      upiId: upiTrimmed || null,
      upiHolderName: upiHolderName.trim() || null,
      bankDetails,
    });
    if (errResult) {
      crossAlert('Error', errResult.message);
      return;
    }
    showToast('Payment methods saved');
    setInitialized(false); // re-sync on next refetch
  }, [
    manualPaymentsEnabled,
    upiId,
    upiHolderName,
    accountHolderName,
    accountNumber,
    ifscCode,
    bankName,
    branchName,
    update,
    showToast,
  ]);

  if (loading) {
    return (
      <View style={styles.center} testID="payment-methods-loading">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !info) {
    return (
      <View style={styles.center}>
        <InlineError message={error.message} onRetry={refetch} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {/* ── Toggle ─────────────────────────────────── */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleIconTile}>
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.toggleIconTileGradient}
          />
          <AppIcon name="cash-fast" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.toggleText}>
          <Text style={styles.toggleTitle}>Accept manual payments</Text>
          <Text style={styles.toggleSubtitle}>
            Let parents pay via UPI, QR or bank transfer and submit a screenshot for you to approve.
          </Text>
          <View style={[styles.toggleStatus, manualPaymentsEnabled ? styles.toggleStatusOn : styles.toggleStatusOff]}>
            <View style={[styles.toggleStatusDot, manualPaymentsEnabled ? styles.toggleStatusDotOn : styles.toggleStatusDotOff]} />
            <Text style={[styles.toggleStatusText, manualPaymentsEnabled ? styles.toggleStatusTextOn : styles.toggleStatusTextOff]}>
              {manualPaymentsEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
        </View>
        <GradientSwitch
          value={manualPaymentsEnabled}
          onValueChange={setManualPaymentsEnabled}
          accessibilityLabel="Accept manual payments"
          testID="manual-payments-toggle"
        />
      </View>

      {/* ── UPI ──────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppIcon name="qrcode" size={18} color={colors.text} />
          <Text style={styles.sectionTitle}>UPI</Text>
        </View>
        <View style={styles.card}>
          <Input
            label="UPI ID"
            value={upiId}
            onChangeText={setUpiId}
            placeholder="yourname@bank"
            autoCapitalize="none"
            testID="upi-id-input"
          />
          <Input
            label="Beneficiary name (shown to parents)"
            value={upiHolderName}
            onChangeText={setUpiHolderName}
            placeholder="e.g. Academy name or owner name"
            testID="upi-holder-input"
          />
        </View>
      </View>

      {/* QR code upload removed — we auto-generate a scannable QR on the
          parent's Pay screen from the UPI ID above. */}

      {/* ── Bank ─────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppIcon name="bank-outline" size={18} color={colors.text} />
          <Text style={styles.sectionTitle}>Bank transfer</Text>
        </View>
        <View style={styles.card}>
          <Input
            label="Account holder name"
            value={accountHolderName}
            onChangeText={setAccountHolderName}
            placeholder="As on passbook"
            testID="bank-holder-input"
          />
          <Input
            label="Account number"
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="9\u201318 digits"
            keyboardType="number-pad"
            testID="bank-account-input"
          />
          <Input
            label="IFSC code"
            value={ifscCode}
            onChangeText={(v) => setIfscCode(v.toUpperCase())}
            placeholder="SBIN0001234"
            autoCapitalize="characters"
            testID="bank-ifsc-input"
          />
          <Input
            label="Bank name"
            value={bankName}
            onChangeText={setBankName}
            placeholder="e.g. HDFC Bank"
            testID="bank-name-input"
          />
          <Input
            label="Branch"
            value={branchName}
            onChangeText={setBranchName}
            placeholder="e.g. Koramangala"
            testID="bank-branch-input"
          />
        </View>
      </View>

      {/* ── Save ─────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving}
        testID="payment-methods-save"
      >
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {!saving && <AppIcon name="content-save-outline" size={18} color="#FFFFFF" />}
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    scroll: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.base, paddingBottom: spacing['3xl'] },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

    toggleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.base,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.base,
      marginBottom: spacing.md,
    },
    toggleIconTile: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    toggleIconTileGradient: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 12,
    },
    toggleText: { flex: 1, minWidth: 0 },
    toggleTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    toggleSubtitle: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginTop: 3,
      lineHeight: 18,
    },
    toggleStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      marginTop: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
      borderWidth: 1,
    },
    toggleStatusOn: {
      backgroundColor: `${colors.success}18`,
      borderColor: `${colors.success}40`,
    },
    toggleStatusOff: {
      backgroundColor: colors.bgSubtle,
      borderColor: colors.border,
    },
    toggleStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    toggleStatusDotOn: {
      backgroundColor: colors.success,
    },
    toggleStatusDotOff: {
      backgroundColor: colors.textDisabled,
    },
    toggleStatusText: {
      fontSize: 10,
      fontWeight: fontWeights.bold,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    toggleStatusTextOn: {
      color: colors.success,
    },
    toggleStatusTextOff: {
      color: colors.textDisabled,
    },

    section: { marginBottom: spacing.md },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
    },
    sectionTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.base,
      gap: spacing.sm,
    },

    saveBtn: {
      overflow: 'hidden',
      borderRadius: radius.xl,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.base,
    },
    saveBtnText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.bold,
      color: '#FFFFFF',
      letterSpacing: -0.2,
    },
  });
