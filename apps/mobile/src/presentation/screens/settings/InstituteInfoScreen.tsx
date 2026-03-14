import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useInstituteInfo } from '../../../application/settings/use-institute-info';
import { instituteInfoApi, uploadInstituteImage, deleteInstituteImage } from '../../../infra/settings/institute-info-api';
import { Input } from '../../components/ui/Input';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

export function InstituteInfoScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { showToast } = useToast();
  const { info, loading, saving, error, update, refetch } = useInstituteInfo(instituteInfoApi);

  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [uploading, setUploading] = useState<'signature' | 'qrcode' | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Sync form state when data loads
  useEffect(() => {
    if (info && !initialized) {
      if (info.bankDetails) {
        setAccountHolderName(info.bankDetails.accountHolderName);
        setAccountNumber(info.bankDetails.accountNumber);
        setIfscCode(info.bankDetails.ifscCode);
        setBankName(info.bankDetails.bankName);
        setBranchName(info.bankDetails.branchName);
      }
      setUpiId(info.upiId ?? '');
      setInitialized(true);
    }
  }, [info, initialized]);

  const handleSaveBankDetails = async () => {
    const hasBankFields = accountHolderName || accountNumber || ifscCode || bankName || branchName;

    const bankDetails = hasBankFields
      ? {
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          bankName: bankName.trim(),
          branchName: branchName.trim(),
        }
      : null;

    const err = await update({
      bankDetails,
      upiId: upiId.trim() || null,
    });

    if (err) {
      Alert.alert('Error', err.message);
    } else {
      showToast('Institute information saved');
    }
  };

  const handlePickImage = useCallback(
    async (imageType: 'signature' | 'qrcode') => {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (result.didCancel || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (!asset.uri || !asset.fileName || !asset.type) return;

      setUploading(imageType);
      const uploadResult = await uploadInstituteImage(
        imageType,
        asset.uri,
        asset.fileName,
        asset.type,
      );
      setUploading(null);

      if (uploadResult.ok) {
        showToast('Image uploaded');
        refetch();
      } else {
        Alert.alert('Upload Error', uploadResult.error.message);
      }
    },
    [refetch, showToast],
  );

  const handleDeleteImage = useCallback(
    (imageType: 'signature' | 'qrcode') => {
      const label = imageType === 'signature' ? 'signature/stamp' : 'QR code';
      Alert.alert(`Delete ${label}`, `Are you sure you want to delete this ${label}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteInstituteImage(imageType);
            if (result.ok) {
              showToast('Image removed');
              refetch();
            } else {
              Alert.alert('Error', result.error.message);
            }
          },
        },
      ]);
    },
    [refetch, showToast],
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.center} testID="institute-loading">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading institute info...</Text>
        </View>
      </View>
    );
  }

  if (error && !info) {
    return (
      <View style={styles.screen}>
        <View style={styles.center} testID="institute-error">
          <View style={styles.errorIconCircle}>
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="alert-circle-outline" size={48} color={colors.danger} />
          </View>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch} testID="institute-retry">
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="refresh" size={18} color={colors.white} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Signature / Stamp ────────────────────────── */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="signature-freehand" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Signature / Stamp</Text>
      </View>
      <View style={styles.card}>
        <ImageUploadCard
          imageUrl={info?.signatureStampUrl ?? null}
          label="Upload Signature / Stamp"
          icon="signature-freehand"
          uploading={uploading === 'signature'}
          onPick={() => handlePickImage('signature')}
          onDelete={() => handleDeleteImage('signature')}
          testID="signature"
        />
      </View>

      {/* ── Payment QR Code ──────────────────────────── */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="qrcode" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Payment QR Code</Text>
      </View>
      <View style={styles.card}>
        <ImageUploadCard
          imageUrl={info?.qrCodeImageUrl ?? null}
          label="Upload QR Code"
          icon="qrcode"
          uploading={uploading === 'qrcode'}
          onPick={() => handlePickImage('qrcode')}
          onDelete={() => handleDeleteImage('qrcode')}
          testID="qrcode"
        />
      </View>

      {/* ── Bank Details ─────────────────────────────── */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="bank-outline" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Bank Details</Text>
      </View>
      <View style={styles.card}>
        <Input
          label="Account Holder Name"
          value={accountHolderName}
          onChangeText={setAccountHolderName}
          placeholder="Account holder name"
          maxLength={100}
          testID="bank-holder-name"
        />
        <Input
          label="Account Number"
          value={accountNumber}
          onChangeText={setAccountNumber}
          placeholder="9-18 digit account number"
          keyboardType="numeric"
          maxLength={18}
          testID="bank-account-number"
        />
        <Input
          label="IFSC Code"
          value={ifscCode}
          onChangeText={setIfscCode}
          placeholder="e.g. SBIN0001234"
          autoCapitalize="characters"
          maxLength={11}
          testID="bank-ifsc"
        />
        <Input
          label="Bank Name"
          value={bankName}
          onChangeText={setBankName}
          placeholder="Bank name"
          maxLength={100}
          testID="bank-name"
        />
        <Input
          label="Branch Name"
          value={branchName}
          onChangeText={setBranchName}
          placeholder="Branch name"
          maxLength={100}
          testID="bank-branch"
        />
      </View>

      {/* ── UPI ──────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="cellphone-nfc" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>UPI</Text>
      </View>
      <View style={styles.card}>
        <Input
          label="UPI ID"
          value={upiId}
          onChangeText={setUpiId}
          placeholder="e.g. academy@upi"
          autoCapitalize="none"
          maxLength={50}
          testID="upi-id"
        />
      </View>

      {/* ── Save Button ──────────────────────────────── */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSaveBankDetails}
        disabled={saving}
        testID="save-institute-info"
      >
        {!saving && (
          // @ts-expect-error react-native-vector-icons types incompatible with @types/react@19
          <Icon name="content-save-outline" size={20} color={colors.white} />
        )}
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Save Details'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ImageUploadCard({
  imageUrl,
  label,
  icon,
  uploading,
  onPick,
  onDelete,
  testID,
}: {
  imageUrl: string | null;
  label: string;
  icon: string;
  uploading: boolean;
  onPick: () => void;
  onDelete: () => void;
  testID: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (uploading) {
    return (
      <View style={styles.uploadCard} testID={`${testID}-uploading`}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.uploadingText}>Uploading...</Text>
      </View>
    );
  }

  if (imageUrl) {
    return (
      <View testID={`${testID}-preview`}>
        <View style={styles.imageWrapper}>
          <Image source={{ uri: imageUrl }} style={styles.previewImage} resizeMode="contain" />
        </View>
        <View style={styles.imageActions}>
          <TouchableOpacity
            style={styles.changeButton}
            onPress={onPick}
            testID={`${testID}-change`}
          >
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="image-edit-outline" size={16} color={colors.primary} />
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={onDelete}
            testID={`${testID}-delete`}
          >
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="trash-can-outline" size={16} color={colors.danger} />
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.uploadCard} onPress={onPick} testID={`${testID}-upload`}>
      <View style={styles.uploadIconCircle}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.uploadLabel}>{label}</Text>
      <Text style={styles.uploadHint}>JPEG, PNG, or WebP (max 5MB)</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.base,
    color: colors.textSecondary,
  },
  errorIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  errorText: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryButtonText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.white,
  },

  /* ── Section Header ─────────────────────────────── */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },

  /* ── Card ────────────────────────────────────────── */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    ...shadows.sm,
  },

  /* ── Upload Card ─────────────────────────────────── */
  uploadCard: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  uploadLabel: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  uploadHint: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  uploadingText: {
    marginTop: spacing.sm,
    fontSize: fontSizes.base,
    color: colors.primary,
  },

  /* ── Image Preview ───────────────────────────────── */
  imageWrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgSubtle,
  },
  previewImage: {
    width: '100%',
    height: 180,
  },
  imageActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  changeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
  },
  changeButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  removeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
  },
  removeButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.danger,
  },

  /* ── Save Button ────────────────────────────────── */
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginTop: spacing.xl,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.white,
  },
});
