import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Keyboard,
  Pressable,
  Platform,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/InlineError';
import { AppIcon } from '../../components/ui/AppIcon';
import { usePasswordReset } from '../../hooks/usePasswordReset';
import { useToast } from '../../context/ToastContext';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type ForgotNav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

const STEPS = [
  { key: 'email', label: 'Email' },
  { key: 'otp', label: 'Verify' },
  { key: 'newPassword', label: 'Reset' },
] as const;

const makeStepStyles = (colors: Colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  item: {
    alignItems: 'center',
  },
  line: {
    height: 2,
    width: 40,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  lineDone: {
    backgroundColor: colors.primary,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgSubtle,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  dotDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  dotText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  dotTextActive: {
    color: colors.primary,
  },
  label: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  labelActive: {
    color: colors.primary,
  },
});

function StepIndicator({ current }: { current: string }) {
  const { colors } = useTheme();
  const stepStyles = useMemo(() => makeStepStyles(colors), [colors]);
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <View style={stepStyles.row} accessibilityRole="progressbar" accessibilityValue={{ now: currentIdx + 1, min: 1, max: 3, text: `Step ${currentIdx + 1} of 3: ${STEPS[currentIdx]?.label}` }}>
      {STEPS.map((s, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <React.Fragment key={s.key}>
            {i > 0 && (
              <View
                style={[stepStyles.line, (isDone || isActive) && stepStyles.lineDone]}
              />
            )}
            <View style={stepStyles.item}>
              <View
                style={[
                  stepStyles.dot,
                  isDone && stepStyles.dotDone,
                  isActive && stepStyles.dotActive,
                ]}
              >
                {isDone ? (
                  <AppIcon name="check" size={12} color={colors.white} />
                ) : (
                  <Text
                    style={[
                      stepStyles.dotText,
                      isActive && stepStyles.dotTextActive,
                    ]}
                  >
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  stepStyles.label,
                  (isDone || isActive) && stepStyles.labelActive,
                ]}
              >
                {s.label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

export function ForgotPasswordScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<ForgotNav>();
  const {
    step,
    loading,
    error,
    fieldErrors: serverFieldErrors,
    cooldownRemaining,
    successMessage,
    requestOtp,
    confirmReset,
    resendOtp,
    goBack,
    setStep,
    clearError,
    clearFieldError: clearServerFieldError,
    reset,
  } = usePasswordReset();

  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const confirmPasswordRef = useRef<TextInput>(null);
  const submittingRef = useRef(false);

  /** Mask email for display: "user@example.com" → "u***@example.com" */
  const maskedEmail = useMemo(() => {
    if (!email) return 'your email';
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    return `${local[0]}${'*'.repeat(Math.max(local.length - 1, 2))}@${domain}`;
  }, [email]);

  // Merge server-side field errors with client-side field errors
  const mergedFieldErrors = { ...fieldErrors, ...serverFieldErrors };

  // --- Field change handlers (clear errors on input) ---

  const clearLocalFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    clearLocalFieldError('email');
    clearServerFieldError('email');
    if (error) clearError();
  }, [clearLocalFieldError, clearServerFieldError, error, clearError]);

  const handleOtpChange = useCallback((text: string) => {
    setOtp(text);
    clearLocalFieldError('otp');
    clearServerFieldError('otp');
    if (error) clearError();
  }, [clearLocalFieldError, clearServerFieldError, error, clearError]);

  const handleNewPasswordChange = useCallback((text: string) => {
    setNewPassword(text);
    clearLocalFieldError('newPassword');
    clearServerFieldError('newPassword');
    if (error) clearError();
  }, [clearLocalFieldError, clearServerFieldError, error, clearError]);

  const handleConfirmPasswordChange = useCallback((text: string) => {
    setConfirmPassword(text);
    clearLocalFieldError('confirmPassword');
    if (error) clearError();
  }, [clearLocalFieldError, error, clearError]);

  // --- Validation ---

  const validateEmail = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    const trimmed = email.trim();
    if (!trimmed) {
      errors['email'] = 'Email is required';
    } else if (!EMAIL_RE.test(trimmed)) {
      errors['email'] = 'Please enter a valid email address';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email]);

  const validateOtp = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    const trimmed = otp.trim();
    if (!trimmed) {
      errors['otp'] = 'Verification code is required';
    } else if (!/^\d{6}$/.test(trimmed)) {
      errors['otp'] = 'Code must be exactly 6 digits';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [otp]);

  const validatePasswords = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!newPassword) {
      errors['newPassword'] = 'Password is required';
    } else if (newPassword.length < 8) {
      errors['newPassword'] = 'Password must be at least 8 characters';
    }
    if (!confirmPassword) {
      errors['confirmPassword'] = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      errors['confirmPassword'] = 'Passwords do not match';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [newPassword, confirmPassword]);

  // --- Step handlers ---

  const handleRequestOtp = useCallback(async () => {
    if (submittingRef.current) return;
    Keyboard.dismiss();
    if (!validateEmail()) return;
    submittingRef.current = true;
    try {
      await requestOtp(email.trim().toLowerCase());
    } finally {
      submittingRef.current = false;
    }
  }, [validateEmail, requestOtp, email]);

  const handleVerifyOtp = useCallback(() => {
    Keyboard.dismiss();
    if (!validateOtp()) return;
    setFieldErrors({});
    setNewPassword('');
    setConfirmPassword('');
    setStep('newPassword');
  }, [validateOtp, setStep]);

  const handleConfirmReset = useCallback(async () => {
    if (submittingRef.current) return;
    Keyboard.dismiss();
    if (!validatePasswords()) return;
    submittingRef.current = true;
    try {
      const success = await confirmReset(
        email.trim().toLowerCase(),
        otp.trim(),
        newPassword,
      );
      if (success) {
        reset();
        setEmail('');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setFieldErrors({});
        showToast('Password reset successfully!', 'success');
        navigation.navigate('Login');
      }
    } finally {
      submittingRef.current = false;
    }
  }, [validatePasswords, confirmReset, email, otp, newPassword, reset, navigation, showToast]);

  const handleResend = useCallback(async () => {
    await resendOtp(email.trim().toLowerCase());
  }, [resendOtp, email]);

  const handleGoBack = useCallback(() => {
    setFieldErrors({});
    goBack();
  }, [goBack]);

  const handleBackToLogin = useCallback(() => {
    reset();
    setEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setFieldErrors({});
    navigation.navigate('Login');
  }, [reset, navigation]);

  const stepConfig = {
    email: {
      icon: 'email-outline' as const,
      title: 'Forgot Password?',
      subtitle: "No worries. Enter your email and we'll send you a reset code.",
    },
    otp: {
      icon: 'shield-key-outline' as const,
      title: 'Verify Code',
      subtitle: `We sent a 6-digit code to ${maskedEmail}`,
    },
    newPassword: {
      icon: 'lock-reset' as const,
      title: 'Set New Password',
      subtitle: 'Choose a strong password for your account',
    },
  };

  const config = stepConfig[step];

  return (
    <Screen style={styles.screen}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <Pressable style={styles.container} onPress={Platform.OS !== 'web' ? Keyboard.dismiss : undefined} accessible={false}>
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.iconBadge}>
            <AppIcon name={config.icon} size={28} color={colors.primary} />
          </View>
          <Text style={styles.title} accessibilityRole="header">{config.title}</Text>
          <Text style={styles.subtitle}>{config.subtitle}</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <StepIndicator current={step} />

          {error ? <InlineError message={error} /> : null}
          {successMessage ? (
            <View style={styles.successBox} accessibilityRole="alert">
              <AppIcon name="check-circle-outline" size={18} color={colors.successText} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {step === 'email' && (
            <>
              <Input
                label="Email"
                value={email}
                onChangeText={handleEmailChange}
                error={mergedFieldErrors['email']}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                maxLength={100}
                returnKeyType="go"
                onSubmitEditing={handleRequestOtp}
                testID="forgot-email"
              />
              <Button
                title={loading ? 'Sending...' : 'Send Reset Code'}
                onPress={handleRequestOtp}
                loading={loading}
                testID="forgot-send"
              />
            </>
          )}

          {step === 'otp' && (
            <>
              <Input
                label="Verification Code"
                value={otp}
                onChangeText={handleOtpChange}
                error={mergedFieldErrors['otp']}
                placeholder="Enter 6-digit code"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                returnKeyType="go"
                onSubmitEditing={handleVerifyOtp}
                testID="forgot-otp"
              />
              <Button
                title="Continue"
                onPress={handleVerifyOtp}
                loading={loading}
                testID="forgot-verify"
              />
              <TouchableOpacity
                style={styles.resendLink}
                onPress={handleResend}
                disabled={cooldownRemaining > 0 || loading}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={
                  cooldownRemaining > 0
                    ? `Resend code available in ${cooldownRemaining} seconds`
                    : 'Resend verification code'
                }
                testID="forgot-resend"
              >
                <Text
                  style={[
                    styles.resendText,
                    cooldownRemaining > 0 && styles.resendDisabled,
                  ]}
                >
                  {cooldownRemaining > 0
                    ? `Resend code in ${cooldownRemaining}s`
                    : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'newPassword' && (
            <>
              <Input
                label="New Password"
                value={newPassword}
                onChangeText={handleNewPasswordChange}
                error={mergedFieldErrors['newPassword']}
                placeholder="Enter new password"
                secureTextEntry
                autoComplete="password-new"
                textContentType="newPassword"
                maxLength={64}
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                testID="forgot-new-password"
              />
              <Input
                ref={confirmPasswordRef}
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                error={mergedFieldErrors['confirmPassword']}
                placeholder="Confirm new password"
                secureTextEntry
                autoComplete="password-new"
                textContentType="newPassword"
                maxLength={64}
                returnKeyType="go"
                onSubmitEditing={handleConfirmReset}
                testID="forgot-confirm-password"
              />
              <Button
                title={loading ? 'Resetting...' : 'Reset Password'}
                onPress={handleConfirmReset}
                loading={loading}
                testID="forgot-reset"
              />
            </>
          )}
        </View>

        {/* Back link */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={step === 'email' ? handleBackToLogin : handleGoBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="link"
            accessibilityLabel={step === 'email' ? 'Back to sign in' : 'Go to previous step'}
            testID="forgot-back"
          >
            <View style={styles.backRow}>
              <AppIcon name="arrow-left" size={16} color={colors.primary} />
              <Text style={styles.backText}>
                {step === 'email' ? 'Back to Sign In' : 'Back'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Screen>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.base,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  successText: {
    fontSize: fontSizes.base,
    color: colors.successText,
    flex: 1,
  },
  resendLink: {
    alignSelf: 'center',
    marginTop: spacing.base,
  },
  resendText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: fontWeights.medium,
  },
  resendDisabled: {
    color: colors.textDisabled,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing['2xl'],
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backText: {
    fontSize: fontSizes.base,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },
});
