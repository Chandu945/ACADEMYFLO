import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { AppIcon } from '../../components/ui/AppIcon';
import { Badge } from '../../components/ui/Badge';
import { InlineError } from '../../components/ui/InlineError';
import { crossAlert } from '../../utils/crossPlatformAlert';
import type { ParentFeesStackParamList } from '../../navigation/ParentFeesStack';
import { parentApi } from '../../../infra/parent/parent-api';
import type {
  AcademyPaymentMethods,
  ParentPaymentMethod,
} from '../../../domain/parent/parent.types';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

type Nav = NativeStackNavigationProp<ParentFeesStackParamList, 'ManualPayment'>;
type Route = RouteProp<ParentFeesStackParamList, 'ManualPayment'>;

type Tab = 'UPI' | 'BANK';

function formatAmount(n: number): string {
  return `\u20B9${n.toLocaleString('en-IN')}`;
}

function formatMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function ManualPaymentScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { showToast } = useToast();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { feeDueId, studentId, monthKey, amount: paramAmount } = route.params;

  const [methods, setMethods] = useState<AcademyPaymentMethods | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('UPI');

  // The amount passed via route params is whatever the calling screen had at
  // navigation time — but the dashboard summary or a parent's child detail
  // can be a few seconds stale (late fee just changed, partial payment just
  // posted, etc). Re-fetch the live FeeDue on mount and use that as the
  // submission amount, so we never POST a stale value the backend will
  // reject with "Amount cannot exceed the payable amount".
  const [liveAmount, setLiveAmount] = useState<number | null>(null);
  const amount = liveAmount ?? paramAmount;

  const [refNumber, setRefNumber] = useState('');
  const [note, setNote] = useState('');
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [proofName, setProofName] = useState<string | null>(null);
  const [proofMime, setProofMime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    parentApi
      .getAcademyPaymentMethods()
      .then((r) => {
        if (!active) return;
        if (r.ok) {
          setMethods(r.value);
          // Prefer UPI tab if available, otherwise BANK.
          if (!r.value.upiId && r.value.bankDetails) {
            setTab('BANK');
          }
        } else {
          setLoadError(r.error.message);
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Pull the up-to-date fee details so the screen reflects the same amount
  // the backend will validate against. We query a 24-month window centered
  // on the fee's month to keep the response small while still covering any
  // backlog the parent dashboard might have surfaced.
  useEffect(() => {
    let active = true;
    const [y, m] = monthKey.split('-').map(Number) as [number, number];
    const from = `${y - 1}-${String(m).padStart(2, '0')}`;
    const to = `${y + 1}-${String(m).padStart(2, '0')}`;
    parentApi
      .getChildFees(studentId, from, to)
      .then((r) => {
        if (!active) return;
        if (!r.ok) return;
        const fresh = r.value.find((f) => f.id === feeDueId);
        if (fresh) {
          // Use totalPayable (server-computed amount + late fee), the same
          // value the backend's validation compares against.
          setLiveAmount(fresh.totalPayable);
        }
      })
      .catch(() => {
        if (!active) return;
        // Network failure — fall back to route-param amount; backend will
        // reject if it's stale, and the user can retry.
      });
    return () => {
      active = false;
    };
  }, [feeDueId, studentId, monthKey]);

  const pickProof = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1280,
        maxHeight: 1280,
      });
      if (result.didCancel || !result.assets?.[0]) return;
      const a = result.assets[0];
      if (!a.uri) return;
      setProofUri(a.uri);
      setProofName(a.fileName ?? 'proof.jpg');
      setProofMime(a.type ?? 'image/jpeg');
    } catch {
      crossAlert(
        'Could not open photo library',
        'Please grant photo access in your device Settings and try again.',
      );
    }
  }, []);

  const openUpiIntent = useCallback(() => {
    if (!methods?.upiId) return;
    const pa = encodeURIComponent(methods.upiId);
    const pn = encodeURIComponent(methods.upiHolderName ?? methods.academyName ?? 'Academy');
    const am = encodeURIComponent(String(amount));
    const cu = 'INR';
    const deepLink = `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tn=${encodeURIComponent('Fee ' + monthKey)}`;
    Linking.openURL(deepLink).catch(() =>
      crossAlert('No UPI app', 'Could not open a UPI app on this device.'),
    );
  }, [methods, amount, monthKey]);

  const copyText = useCallback(
    (text: string, label: string) => {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text).then(
          () => showToast(`${label} copied`),
          () => {},
        );
      } else {
        showToast(`Long-press to copy ${label.toLowerCase()}`);
      }
    },
    [showToast],
  );

  const submit = useCallback(async () => {
    if (!proofUri || !proofName || !proofMime) {
      crossAlert('Proof required', 'Please upload a screenshot of your payment.');
      return;
    }
    if (tab === 'UPI' && !refNumber.trim()) {
      crossAlert('Reference required', 'Please enter the UPI transaction ID from your payment app.');
      return;
    }

    setSubmitting(true);
    const res = await parentApi.submitManualPaymentRequest({
      studentId,
      feeDueId,
      amount,
      paymentMethod: tab,
      paymentRefNumber: refNumber.trim() || undefined,
      parentNote: note.trim() || undefined,
      proofImageUri: proofUri,
      proofImageFileName: proofName,
      proofImageMimeType: proofMime,
    });
    setSubmitting(false);

    if (!res.ok) {
      crossAlert('Could not submit', res.error.message);
      return;
    }
    showToast('Payment request submitted');
    navigation.goBack();
  }, [
    tab,
    refNumber,
    note,
    proofUri,
    proofName,
    proofMime,
    studentId,
    feeDueId,
    amount,
    navigation,
    showToast,
  ]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <InlineError message={loadError} />
      </View>
    );
  }

  if (!methods || !methods.manualPaymentsEnabled) {
    return (
      <View style={styles.center}>
        <View style={styles.disabledTile}>
          <AppIcon name="lock-outline" size={24} color={colors.warningText} />
        </View>
        <Text style={styles.disabledTitle}>Manual payments not available</Text>
        <Text style={styles.disabledSubtitle}>
          Your academy hasn't enabled manual payments yet. Please reach out to them directly.
        </Text>
      </View>
    );
  }

  const hasUpi = !!methods.upiId;
  const hasBank = !!methods.bankDetails;
  // QR is always generated from the UPI ID with the current amount + month
  // baked in, so parents scan and pay the exact due amount without retyping.
  const generatedQrPayload = hasUpi
    ? `upi://pay?pa=${encodeURIComponent(methods.upiId!)}` +
      `&pn=${encodeURIComponent(methods.upiHolderName ?? methods.academyName ?? 'Academy')}` +
      `&am=${encodeURIComponent(String(amount))}&cu=INR` +
      `&tn=${encodeURIComponent('Fee ' + monthKey)}`
    : null;
  const upiTabAvailable = hasUpi;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Amount header */}
      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>Amount to pay</Text>
        <Text style={styles.amountValue}>{formatAmount(amount)}</Text>
        <Text style={styles.amountMeta}>
          {formatMonthKey(monthKey)} {'\u00B7'} {methods.academyName}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {upiTabAvailable && (
          <TouchableOpacity
            style={[styles.tab, tab === 'UPI' && styles.tabActive]}
            onPress={() => setTab('UPI')}
            testID="tab-upi"
          >
            {tab === 'UPI' && (
              <LinearGradient
                colors={[gradient.start, gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <AppIcon
              name="qrcode"
              size={16}
              color={tab === 'UPI' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text style={[styles.tabText, tab === 'UPI' && styles.tabTextActive]}>UPI / QR</Text>
          </TouchableOpacity>
        )}
        {hasBank && (
          <TouchableOpacity
            style={[styles.tab, tab === 'BANK' && styles.tabActive]}
            onPress={() => setTab('BANK')}
            testID="tab-bank"
          >
            {tab === 'BANK' && (
              <LinearGradient
                colors={[gradient.start, gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <AppIcon
              name="bank-outline"
              size={16}
              color={tab === 'BANK' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text style={[styles.tabText, tab === 'BANK' && styles.tabTextActive]}>Bank</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Method detail */}
      {tab === 'UPI' && upiTabAvailable ? (
        <View style={styles.methodCard}>
          {generatedQrPayload && (
            <View style={styles.qrWrap}>
              <View style={styles.qrGenerated}>
                <QRCode
                  value={generatedQrPayload}
                  size={200}
                  backgroundColor="#FFFFFF"
                  color="#05070D"
                />
              </View>
              <Text style={styles.qrCaption}>Scan with any UPI app</Text>
            </View>
          )}
          {hasUpi && (
            <View>
              <View style={styles.methodDivider} />
              {/* Divider above UPI ID since the QR is always rendered first. */}
              <Text style={styles.fieldLabel}>UPI ID</Text>
              <TouchableOpacity
                style={styles.copyRow}
                onPress={() => copyText(methods.upiId!, 'UPI ID')}
                onLongPress={() => copyText(methods.upiId!, 'UPI ID')}
              >
                <Text style={styles.copyValue} selectable>
                  {methods.upiId}
                </Text>
                <AppIcon name="content-copy" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              {methods.upiHolderName ? (
                <Text style={styles.holderName}>{methods.upiHolderName}</Text>
              ) : null}
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={styles.upiIntentBtn}
                  onPress={openUpiIntent}
                  testID="open-upi-app"
                >
                  <LinearGradient
                    colors={[gradient.start, gradient.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <AppIcon name="qrcode-scan" size={16} color="#FFFFFF" />
                  <Text style={styles.upiIntentBtnText}>Open UPI app</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ) : null}

      {tab === 'BANK' && hasBank ? (
        <View style={styles.methodCard}>
          <BankField
            label="Account holder"
            value={methods.bankDetails!.accountHolderName}
            onCopy={copyText}
            colors={colors}
          />
          <BankField
            label="Account number"
            value={methods.bankDetails!.accountNumber}
            onCopy={copyText}
            colors={colors}
            monospace
          />
          <BankField
            label="IFSC"
            value={methods.bankDetails!.ifscCode}
            onCopy={copyText}
            colors={colors}
            monospace
          />
          <BankField
            label="Bank"
            value={methods.bankDetails!.bankName}
            onCopy={copyText}
            colors={colors}
          />
          <BankField
            label="Branch"
            value={methods.bankDetails!.branchName}
            onCopy={copyText}
            colors={colors}
            isLast
          />
        </View>
      ) : null}

      {/* Proof upload */}
      <View style={styles.sectionHeader}>
        <AppIcon name="image-outline" size={18} color={colors.text} />
        <Text style={styles.sectionTitle}>Upload payment proof</Text>
      </View>
      <View style={styles.card}>
        {proofUri ? (
          <View>
            <Image source={{ uri: proofUri }} style={styles.proofPreview} resizeMode="cover" />
            <TouchableOpacity style={styles.proofChangeBtn} onPress={pickProof}>
              <AppIcon name="image-edit-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.proofChangeText}>Change screenshot</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.proofUploadTile}
            onPress={pickProof}
            testID="proof-upload"
          >
            <View style={styles.proofUploadIcon}>
              <LinearGradient
                colors={[gradient.start, gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <AppIcon name="upload" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.proofUploadTitle}>Tap to upload</Text>
            <Text style={styles.proofUploadSubtitle}>
              Screenshot of your payment confirmation
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Ref + note */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>
          {tab === 'UPI' ? 'UPI transaction ID' : 'Reference number'}
          {tab === 'UPI' ? ' *' : ''}
        </Text>
        <TextInput
          style={styles.input}
          value={refNumber}
          onChangeText={setRefNumber}
          placeholder={tab === 'UPI' ? 'From your UPI app (e.g. 123456789012)' : 'Optional'}
          placeholderTextColor={colors.textDisabled}
          autoCapitalize="none"
          maxLength={50}
          testID="ref-number"
        />

        <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Note (optional)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={note}
          onChangeText={setNote}
          placeholder="Anything to tell the owner..."
          placeholderTextColor={colors.textDisabled}
          multiline
          maxLength={500}
          testID="parent-note"
        />
      </View>

      {/* Status hint */}
      <View style={styles.hintRow}>
        <Badge label="PENDING" variant="warning" dot uppercase />
        <Text style={styles.hintText}>
          Your request will be marked pending until the owner approves.
        </Text>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        onPress={submit}
        disabled={submitting}
        testID="submit-manual-payment"
      >
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {!submitting && <AppIcon name="send" size={18} color="#FFFFFF" />}
        <Text style={styles.submitBtnText}>
          {submitting ? 'Submitting...' : `Submit \u2022 ${formatAmount(amount)}`}
        </Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

function BankField({
  label,
  value,
  onCopy,
  colors,
  monospace,
  isLast,
}: {
  label: string;
  value: string;
  onCopy: (text: string, label: string) => void;
  colors: Colors;
  monospace?: boolean;
  isLast?: boolean;
}) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.bankRow, !isLast && styles.bankRowBorder]}>
      <Text style={styles.bankRowLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.bankRowValueWrap}
        onPress={() => onCopy(value, label)}
        onLongPress={() => onCopy(value, label)}
      >
        <Text
          style={[
            styles.bankRowValue,
            monospace && {
              fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
            },
          ]}
          selectable
          numberOfLines={1}
        >
          {value}
        </Text>
        <AppIcon name="content-copy" size={14} color={colors.textDisabled} />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    scroll: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.base, paddingBottom: spacing['3xl'] },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
      padding: spacing.xl,
    },

    disabledTile: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: colors.warningBg,
      borderWidth: 1,
      borderColor: colors.warningBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.base,
    },
    disabledTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    disabledSubtitle: {
      fontSize: fontSizes.sm,
      color: colors.textMedium,
      textAlign: 'center',
      lineHeight: 20,
    },

    /* Amount hero */
    amountCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.base,
      marginBottom: spacing.md,
      alignItems: 'center',
    },
    amountLabel: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    amountValue: {
      fontSize: fontSizes['4xl'],
      fontWeight: fontWeights.heavy,
      color: colors.text,
      letterSpacing: -1,
      marginTop: 4,
    },
    amountMeta: {
      fontSize: fontSizes.sm,
      color: colors.textMedium,
      marginTop: spacing.xs,
    },

    /* Tabs */
    tabs: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: 12,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    tabActive: {
      borderColor: 'transparent',
    },
    tabText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
    },
    tabTextActive: { color: '#FFFFFF' },

    /* Method card */
    methodCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.base,
      marginBottom: spacing.md,
    },
    qrWrap: { alignItems: 'center' },
    qrGenerated: {
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: '#FFFFFF',
    },
    qrCaption: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    methodDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.base,
    },
    fieldLabel: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
    copyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.bgSubtle,
      borderRadius: radius.md,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
    },
    copyValue: {
      flex: 1,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      letterSpacing: 0.2,
    },
    holderName: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    upiIntentBtn: {
      marginTop: spacing.md,
      overflow: 'hidden',
      borderRadius: radius.lg,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    upiIntentBtnText: {
      color: '#FFFFFF',
      fontWeight: fontWeights.semibold,
      fontSize: fontSizes.sm,
    },

    /* Bank rows */
    bankRow: {
      paddingVertical: spacing.sm,
    },
    bankRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    bankRowLabel: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    bankRowValueWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    bankRowValue: {
      flex: 1,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },

    /* Sections */
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

    /* Generic card */
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.base,
      marginBottom: spacing.md,
    },

    /* Proof */
    proofUploadTile: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
      backgroundColor: colors.bgSubtle,
      borderRadius: radius.lg,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      borderStyle: 'dashed',
    },
    proofUploadIcon: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    proofUploadTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    proofUploadSubtitle: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    proofPreview: {
      width: '100%',
      height: 200,
      borderRadius: radius.lg,
      backgroundColor: colors.bgSubtle,
    },
    proofChangeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.bgSubtle,
    },
    proofChangeText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: colors.textSecondary,
    },

    /* Inputs */
    input: {
      backgroundColor: colors.bgSubtle,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: fontSizes.md,
      color: colors.text,
    },
    textarea: {
      minHeight: 72,
      textAlignVertical: 'top',
    },

    /* Hint */
    hintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.base,
      paddingHorizontal: spacing.xs,
    },
    hintText: {
      flex: 1,
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      lineHeight: 16,
    },

    /* Submit */
    submitBtn: {
      overflow: 'hidden',
      borderRadius: radius.xl,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    submitBtnText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.bold,
      color: '#FFFFFF',
      letterSpacing: -0.2,
    },
  });
