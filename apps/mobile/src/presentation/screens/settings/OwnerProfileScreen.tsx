/**
 * BUG-039: Owner profile editing screen. Mirrors the shape of
 * ParentProfileScreen but targets the generic /api/v1/profile endpoint
 * (which serves any authenticated user scoped by their userId). Kept as a
 * separate screen from ParentProfileScreen so the two roles can diverge
 * over time without conditionals; see the design discussion attached to
 * BUG-039 for rationale (rule of three — don't abstract for two callers).
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { crossAlert } from '../../utils/crossPlatformAlert';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/ui/AppIcon';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { ProfilePhotoUploader } from '../../components/common/ProfilePhotoUploader';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { getProfileUseCase } from '../../../application/profile/use-cases/get-profile.usecase';
import { updateProfileUseCase } from '../../../application/profile/use-cases/update-profile.usecase';
import { profileApi } from '../../../infra/profile/profile-api';
import { useAuth } from '../../context/AuthContext';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Nav = NativeStackNavigationProp<MoreStackParamList, 'OwnerProfile'>;

// Country-code helpers — identical semantics to the parent screen. Duplicated
// to keep the two screens self-contained; if a third caller appears we'll
// lift them to a shared `phone-utils` module.
function normalizeToE164(raw: string): string {
  const digits = raw.replace(/[\s\-()]/g, '');
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (digits.startsWith('+')) return digits;
  if (/^\d{12}$/.test(digits) && digits.startsWith('91')) return `+${digits}`;
  return raw;
}

function stripCountryCode(phone: string): string {
  if (!phone) return '';
  const stripped = phone.replace(/^\+91/, '').replace(/^\+/, '');
  if (/^91\d{10}$/.test(stripped)) return stripped.slice(2);
  return stripped;
}

export function OwnerProfileScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const { logout, user } = useAuth();

  // Editable state. Email + role are surfaced read-only; profile photo is
  // uploaded immediately by ProfilePhotoUploader (not part of the dirty form).
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [role, setRole] = useState<string>(user?.role ?? 'OWNER');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  // Snapshot of the last persisted values — updated on load and on save success
  // so the dirty-check resets after Save without leaving the screen.
  const initialRef = useRef({ fullName: '', phoneNumber: '' });

  const isDirty =
    !loading &&
    (fullName !== initialRef.current.fullName ||
      phoneNumber !== initialRef.current.phoneNumber);
  useUnsavedChangesWarning(isDirty && !saving);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await getProfileUseCase({ profileApi });
      if (!mountedRef.current) return;
      if (result.ok) {
        const loadedPhone = stripCountryCode(result.value.phoneNumber);
        setFullName(result.value.fullName);
        setEmail(result.value.email);
        setPhoneNumber(loadedPhone);
        setProfilePhotoUrl(result.value.profilePhotoUrl ?? null);
        setRole(result.value.role);
        initialRef.current = { fullName: result.value.fullName, phoneNumber: loadedPhone };
      } else {
        setError(result.error.message);
      }
    } catch (e) {
      if (__DEV__) console.error('[OwnerProfileScreen] Load failed:', e);
      if (mountedRef.current) {
        setError('Failed to load profile.');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const handleSave = useCallback(async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError('Full name is required');
      return;
    }
    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (!/^[a-zA-Z\s'.,-]+$/.test(trimmedName)) {
      setError('Name can only contain letters, spaces, and punctuation');
      return;
    }
    const phone = phoneNumber.trim();
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid 10-digit phone number starting with 6-9');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await updateProfileUseCase(
        {
          fullName: trimmedName,
          phoneNumber: phone ? normalizeToE164(phone) : '',
        },
        { profileApi },
      );
      if (result.ok) {
        // Reset dirty baseline so the screen returns to clean state after save.
        initialRef.current = { fullName: trimmedName, phoneNumber: phone };
        crossAlert('Success', 'Profile updated successfully');
      } else {
        setError(result.error.message);
      }
    } catch (e) {
      if (__DEV__) console.error('[OwnerProfileScreen] Save failed:', e);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [fullName, phoneNumber]);

  if (loading) {
    return (
      <Screen edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      {/* Avatar Header */}
      <View style={styles.avatarSection}>
        <ProfilePhotoUploader
          currentPhotoUrl={profilePhotoUrl}
          uploadPath="/api/v1/profile/photo"
          onPhotoUploaded={setProfilePhotoUrl}
          size={90}
          testID="owner-profile-photo"
          fallbackName={fullName}
        />
        <Text style={styles.avatarName}>{fullName}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{role}</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <AppIcon name="alert-circle-outline" size={16} color={colors.dangerText} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Form */}
      <View style={styles.formCard}>
        <Input
          label="Full Name"
          value={fullName}
          onChangeText={(text) => setFullName(text.replace(/[^a-zA-Z\s'.,-]/g, ''))}
          autoCapitalize="words"
          maxLength={100}
          testID="owner-profile-fullname"
        />

        <Input
          label="Email"
          value={email}
          onChangeText={() => {}}
          keyboardType="email-address"
          testID="owner-profile-email"
        />
        <View style={styles.readOnlyRow}>
          <AppIcon name="lock-outline" size={12} color={colors.textDisabled} />
          <Text style={styles.readOnlyHint}>Email cannot be changed</Text>
        </View>

        <Input
          label="Phone Number"
          value={phoneNumber}
          onChangeText={(text) => {
            let digits = text.replace(/[^0-9]/g, '');
            if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
            // Indian-mobile leading-digit rule: 6/7/8/9 only — block other
            // first digits at the input so the user gets an immediate cue
            // instead of a save-time error.
            if (digits.length > 0 && !/^[6-9]/.test(digits)) return;
            setPhoneNumber(digits.slice(0, 10));
          }}
          prefix="+91"
          placeholder="9876543210"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={10}
          testID="owner-profile-phone"
        />

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
          testID="owner-profile-save"
        >
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <AppIcon name="content-save-outline" size={18} color={colors.white} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Change Password */}
      <TouchableOpacity
        style={styles.changePasswordButton}
        onPress={() => navigation.navigate('ChangePassword')}
        testID="owner-profile-change-password"
      >
        <View style={styles.cpIconContainer}>
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="key-outline" size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.changePasswordText}>Change Password</Text>
        <AppIcon name="chevron-right" size={20} color={colors.textDisabled} />
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          // Logout switches the RootNavigator phase rather than dispatching a
          // nav action, so the screen-level beforeRemove guard never fires.
          // Inline the dirty-check here so unsaved profile edits aren't
          // discarded silently when the user taps Logout.
          if (isDirty) {
            crossAlert(
              'Discard changes?',
              'You have unsaved profile changes. Logging out will discard them.',
              [
                { text: 'Stay', style: 'cancel' },
                {
                  text: 'Discard & Logout',
                  style: 'destructive',
                  onPress: () => logout(),
                },
              ],
            );
            return;
          }
          crossAlert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: () => logout() },
          ]);
        }}
        testID="owner-profile-logout"
      >
        <View style={styles.logoutIconContainer}>
          <AppIcon name="logout" size={20} color={colors.danger} />
        </View>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: {
      marginTop: spacing.md,
      fontSize: fontSizes.md,
      color: colors.textSecondary,
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    avatarName: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    roleBadge: {
      backgroundColor: colors.bgSubtle,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
      marginTop: spacing.xs,
    },
    roleText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    errorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.dangerBg,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.base,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    errorText: {
      color: colors.dangerText,
      fontSize: fontSizes.sm,
      flex: 1,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.base,
      ...shadows.sm,
      marginBottom: spacing.base,
    },
    readOnlyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: -spacing.sm,
      marginBottom: spacing.base,
    },
    readOnlyHint: {
      fontSize: fontSizes.xs,
      color: colors.textDisabled,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      overflow: 'hidden',
      borderRadius: radius.lg,
      padding: spacing.base,
      marginTop: spacing.sm,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: colors.white,
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.semibold,
    },
    changePasswordButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.base,
      ...shadows.sm,
    },
    cpIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    changePasswordText: {
      flex: 1,
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: colors.text,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.base,
      marginTop: spacing.base,
      ...shadows.sm,
    },
    logoutIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.dangerBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    logoutText: {
      flex: 1,
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: colors.danger,
    },
  });
