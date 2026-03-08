import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/InlineError';
import { usePasswordReset } from '../../hooks/usePasswordReset';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

type ForgotNav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen() {
  const navigation = useNavigation<ForgotNav>();
  const {
    step,
    loading,
    error,
    cooldownRemaining,
    successMessage,
    requestOtp,
    confirmReset,
    resendOtp,
    goBack,
    setStep,
  } = usePasswordReset();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateEmail = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!email.trim()) errors['email'] = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email.trim())) errors['email'] = 'Invalid email address';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email]);

  const validateOtp = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!otp.trim()) errors['otp'] = 'Verification code is required';
    else if (!/^\d{6}$/.test(otp.trim())) errors['otp'] = 'Code must be 6 digits';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [otp]);

  const validatePasswords = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!newPassword) errors['newPassword'] = 'Password is required';
    else if (newPassword.length < 8)
      errors['newPassword'] = 'Password must be at least 8 characters';
    if (!confirmPassword) errors['confirmPassword'] = 'Please confirm your password';
    else if (newPassword !== confirmPassword)
      errors['confirmPassword'] = 'Passwords do not match';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [newPassword, confirmPassword]);

  const handleRequestOtp = useCallback(async () => {
    if (!validateEmail()) return;
    await requestOtp(email.trim().toLowerCase());
  }, [email, validateEmail, requestOtp]);

  const handleVerifyOtp = useCallback(() => {
    if (!validateOtp()) return;
    setFieldErrors({});
    setStep('newPassword');
  }, [validateOtp, setStep]);

  const handleConfirmReset = useCallback(async () => {
    if (!validatePasswords()) return;
    const success = await confirmReset(email.trim().toLowerCase(), otp.trim(), newPassword);
    if (success) {
      navigation.navigate('Login');
    }
  }, [email, otp, newPassword, validatePasswords, confirmReset, navigation]);

  const handleResend = useCallback(async () => {
    await resendOtp(email.trim().toLowerCase());
  }, [email, resendOtp]);

  if (step === 'email') {
    return (
      <Screen>
        <View style={styles.header}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>Enter your email to receive a reset code</Text>
        </View>

        {error ? <InlineError message={error} /> : null}

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={fieldErrors['email']}
          placeholder="Enter your email"
          keyboardType="email-address"
          testID="forgot-email"
        />

        <Button
          title="Send Reset Code"
          onPress={handleRequestOtp}
          loading={loading}
          testID="forgot-send"
        />

        <View style={styles.links}>
          <Button
            title="Back to Sign In"
            variant="secondary"
            onPress={() => navigation.navigate('Login')}
            testID="forgot-back"
          />
        </View>
      </Screen>
    );
  }

  if (step === 'otp') {
    return (
      <Screen>
        <View style={styles.header}>
          <Text style={styles.title}>Enter Code</Text>
          <Text style={styles.subtitle}>Code sent to {email}</Text>
        </View>

        {error ? <InlineError message={error} /> : null}

        <Input
          label="Verification Code"
          value={otp}
          onChangeText={setOtp}
          error={fieldErrors['otp']}
          placeholder="Enter 6-digit code"
          keyboardType="number-pad"
          testID="forgot-otp"
        />

        <Button
          title="Verify Code"
          onPress={handleVerifyOtp}
          loading={loading}
          testID="forgot-verify"
        />

        <View style={styles.links}>
          <Button
            title={
              cooldownRemaining > 0
                ? `Resend Code (${cooldownRemaining}s)`
                : 'Resend Code'
            }
            variant="secondary"
            onPress={handleResend}
            disabled={cooldownRemaining > 0}
            testID="forgot-resend"
          />
          <View style={styles.spacer} />
          <Button
            title="Back"
            variant="secondary"
            onPress={goBack}
            testID="forgot-back-otp"
          />
        </View>
      </Screen>
    );
  }

  // step === 'newPassword'
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>New Password</Text>
        <Text style={styles.subtitle}>Choose a new password for your account</Text>
      </View>

      {error ? <InlineError message={error} /> : null}
      {successMessage ? (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      <Input
        label="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        error={fieldErrors['newPassword']}
        placeholder="Enter new password"
        secureTextEntry
        testID="forgot-new-password"
      />

      <Input
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={fieldErrors['confirmPassword']}
        placeholder="Confirm new password"
        secureTextEntry
        testID="forgot-confirm-password"
      />

      <Button
        title="Reset Password"
        onPress={handleConfirmReset}
        loading={loading}
        testID="forgot-reset"
      />

      <View style={styles.links}>
        <Button
          title="Back"
          variant="secondary"
          onPress={goBack}
          testID="forgot-back-password"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    marginTop: spacing['3xl'],
  },
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  links: {
    marginTop: spacing.xl,
  },
  spacer: {
    height: spacing.md,
  },
  successContainer: {
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: radius.md,
    padding: spacing.base,
    marginVertical: spacing.md,
  },
  successText: {
    fontSize: fontSizes.base,
    color: colors.successText,
  },
});
