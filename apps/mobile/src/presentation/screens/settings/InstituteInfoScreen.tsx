import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,

  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { crossAlert } from '../../utils/crossPlatformAlert';
import { launchImageLibrary } from 'react-native-image-picker';
import { AppIcon } from '../../components/ui/AppIcon';
import { useInstituteInfo } from '../../../application/settings/use-institute-info';
import { instituteInfoApi, uploadInstituteImage, deleteInstituteImage } from '../../../infra/settings/institute-info-api';
import LinearGradient from 'react-native-linear-gradient';
import { Input } from '../../components/ui/Input';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';

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

  const isDirty = initialized && (
    accountHolderName !== (info?.bankDetails?.accountHolderName ?? '') ||
    accountNumber !== (info?.bankDetails?.accountNumber ?? '') ||
    ifscCode !== (info?.bankDetails?.ifscCode ?? '') ||
    bankName !== (info?.bankDetails?.bankName ?? '') ||
    branchName !== (info?.bankDetails?.branchName ?? '') ||
    upiId !== (info?.upiId ?? '')
  );

  useUnsavedChangesWarning(isDirty && !saving);

  const handleSaveBankDetails = async () => {
    const hasBankFields = accountHolderName || accountNumber || ifscCode || bankName || branchName;

    // Validate bank fields if any bank field is filled
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

      const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscPattern.test(ifscCode.trim().toUpperCase())) {
        crossAlert('Validation', 'IFSC Code must be 11 characters in the format: 4 letters, 0, then 6 alphanumeric characters (e.g. SBIN0001234).');
        return;
      }

      const acctNum = accountNumber.trim();
      if (!/^\d{9,18}$/.test(acctNum)) {
        crossAlert('Validation', 'Account number must be 9 to 18 digits.');
        return;
      }
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

    try {
      const err = await update({
        bankDetails,
        upiId: upiId.trim() || null,
      });

      if (err) {
        crossAlert('Error', err.message);
      } else {
        showToast('Institute information saved');
      }
    } catch (e) {
      if (__DEV__) console.error('[InstituteInfoScreen] Save failed:', e);
      crossAlert('Error', 'Something went wrong. Please try again.');
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
      try {
        const uploadResult = await uploadInstituteImage(
          imageType,
          asset.uri,
          asset.fileName,
          asset.type,
        );

        if (uploadResult.ok) {
          showToast('Image uploaded');
          refetch();
        } else {
          crossAlert('Upload Error', uploadResult.error.message);
        }
      } catch (e) {
        if (__DEV__) console.error('[InstituteInfoScreen] Upload failed:', e);
        crossAlert('Upload Error', 'Something went wrong. Please try again.');
      } finally {
        setUploading(null);
      }
    },
    [refetch, showToast],
  );

  const handleDeleteImage = useCallback(
    (imageType: 'signature' | 'qrcode') => {
      const label = imageType === 'signature' ? 'signature/stamp' : 'QR code';
      crossAlert(`Delete ${label}`, `Are you sure you want to delete this ${label}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteInstituteImage(imageType);
              if (result.ok) {
                showToast('Image removed');
                refetch();
              } else {
                crossAlert('Error', result.error.message);
              }
            } catch (e) {
              if (__DEV__) console.error('[InstituteInfoScreen] Delete image failed:', e);
              crossAlert('Error', 'Something went wrong. Please try again.');
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
            
            <AppIcon name="alert-circle-outline" size={48} color={colors.danger} />
          </View>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch} testID="institute-retry">
            <LinearGradient
              colors={[gradient.start, gradient.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <AppIcon name="refresh" size={18} color={colors.white} />
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
      keyboardDismissMode="on-drag"
    >
      {/* ── Save Button ──────────────────────────────── */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSaveBankDetails}
        disabled={saving}
        testID="save-institute-info"
      >
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {!saving && (

          <AppIcon name="content-save-outline" size={20} color={colors.white} />
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
            
            <AppIcon name="image-edit-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={onDelete}
            testID={`${testID}-delete`}
          >
            
            <AppIcon name="trash-can-outline" size={16} color={colors.danger} />
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.uploadCard} onPress={onPick} testID={`${testID}-upload`}>
      <View style={styles.uploadIconCircle}>
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <AppIcon name={icon} size={28} color="#FFFFFF" />
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
    overflow: 'hidden',
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
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  uploadLabel: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  uploadHint: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  uploadingText: {
    marginTop: spacing.sm,
    fontSize: fontSizes.base,
    color: colors.text,
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
    color: colors.text,
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
    overflow: 'hidden',
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
