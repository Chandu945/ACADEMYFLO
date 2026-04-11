import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Keyboard,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import type { TextInput } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/InlineError';
import { AppIcon } from '../../components/ui/AppIcon';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type SignupNav = NativeStackNavigationProp<AuthStackParamList, 'OwnerSignup'>;

const E164_REGEX = /^\+[1-9]\d{6,14}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX = /^[a-zA-Z\s'.,-]+$/;
const MIN_PASSWORD_LENGTH = 8;
const RATE_LIMIT_COOLDOWN_S = 30;

function normalizePhone(raw: string): string {
  const stripped = raw.replace(/[\s\-()]/g, '');
  // Bare 10-digit number → assume India (+91)
  if (/^\d{10}$/.test(stripped)) return `+91${stripped}`;
  // Already has + prefix → return as-is
  if (stripped.startsWith('+')) return stripped;
  // Country code without + (e.g. "919876543210") → prepend +
  if (/^[1-9]\d{7,14}$/.test(stripped) && stripped.length > 10) return `+${stripped}`;
  return stripped;
}

export function OwnerSignupScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<SignupNav>();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [cooldown, setCooldown] = useState(0);

  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const submittingRef = useRef(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasUnsavedChanges = !!(fullName || email || phoneNumber || password);
  useUnsavedChangesWarning(hasUnsavedChanges);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleFullNameChange = useCallback((text: string) => {
    setFullName(text.replace(/[^a-zA-Z\s'.,-]/g, ''));
    clearFieldError('fullName');
    if (error) setError(null);
  }, [clearFieldError, error]);

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    clearFieldError('email');
    if (error) setError(null);
  }, [clearFieldError, error]);

  const handlePhoneChange = useCallback((text: string) => {
    let digitsOnly = text.replace(/[^0-9]/g, '');
    if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) digitsOnly = digitsOnly.slice(2);
    if (digitsOnly.length > 0 && !/^[6-9]/.test(digitsOnly)) return;
    setPhoneNumber(digitsOnly.slice(0, 10));
    clearFieldError('phoneNumber');
    if (error) setError(null);
  }, [clearFieldError, error]);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
    clearFieldError('password');
    if (error) setError(null);
  }, [clearFieldError, error]);

  const handleConfirmPasswordChange = useCallback((text: string) => {
    setConfirmPassword(text);
    clearFieldError('confirmPassword');
    if (error) setError(null);
  }, [clearFieldError, error]);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phoneNumber.trim();

    if (!trimmedName) {
      errors['fullName'] = 'Full name is required';
    } else if (trimmedName.length < 2) {
      errors['fullName'] = 'Name must be at least 2 characters';
    } else if (!NAME_REGEX.test(trimmedName)) {
      errors['fullName'] = 'Name can only contain letters, spaces, and common punctuation';
    }

    if (!trimmedEmail) {
      errors['email'] = 'Email is required';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors['email'] = 'Please enter a valid email address';
    }

    if (!trimmedPhone) {
      errors['phoneNumber'] = 'Phone number is required';
    } else if (!E164_REGEX.test(normalizePhone(trimmedPhone))) {
      errors['phoneNumber'] = 'Please enter a valid 10-digit phone number';
    }

    if (!password) {
      errors['password'] = 'Password is required';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors['password'] = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])/.test(password)) {
      errors['password'] = 'Must contain uppercase, lowercase, number, and special character';
    }

    if (!confirmPassword) {
      errors['confirmPassword'] = 'Please confirm your password';
    } else if (confirmPassword !== password) {
      errors['confirmPassword'] = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [fullName, email, phoneNumber, password, confirmPassword]);

  const startCooldown = useCallback(() => {
    setCooldown(RATE_LIMIT_COOLDOWN_S);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1_000);
  }, []);

  const handleSignup = useCallback(async () => {
    if (submittingRef.current || cooldown > 0) return;
    Keyboard.dismiss();
    setError(null);
    if (!validate()) return;

    submittingRef.current = true;
    setLoading(true);
    try {
      const result = await signup({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: normalizePhone(phoneNumber.trim()),
        password,
      });

      if (result) {
        if (result.code === 'RATE_LIMITED') {
          setError(result.message);
          startCooldown();
        } else {
          const msg = result.message;
          if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
            setFieldErrors(result.fieldErrors);
          } else if (/email already exists/i.test(msg)) {
            setFieldErrors({ email: msg });
          } else if (/phone.*already exists/i.test(msg)) {
            setFieldErrors({ phoneNumber: msg });
          } else {
            setError(msg);
          }
        }
      }
    } catch {
      if (__DEV__) console.error('[OwnerSignupScreen] Unexpected signup error');
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }, [signup, validate, fullName, email, phoneNumber, password, cooldown, startCooldown]);

  // Cleanup cooldown interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  return (
    <Screen style={styles.screen}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <Pressable style={styles.container} onPress={Platform.OS !== 'web' ? Keyboard.dismiss : undefined} accessible={false}>
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.iconBadge}>
            <AppIcon name="account-plus-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title} accessibilityRole="header">Create Account</Text>
          <Text style={styles.subtitle}>Set up your academy in minutes</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          {error ? <InlineError message={error} /> : null}

          <Input
            label="Full Name"
            value={fullName}
            onChangeText={handleFullNameChange}
            error={fieldErrors['fullName']}
            placeholder="Enter your full name"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            maxLength={100}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            testID="signup-name"
          />

          <Input
            ref={emailRef}
            label="Email"
            value={email}
            onChangeText={handleEmailChange}
            error={fieldErrors['email']}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            maxLength={100}
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            testID="signup-email"
          />

          <Input
            ref={phoneRef}
            label="Phone Number"
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            error={fieldErrors['phoneNumber']}
            prefix="+91"
            placeholder="9876543210"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={10}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            testID="signup-phone"
          />

          <Input
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={handlePasswordChange}
            error={fieldErrors['password']}
            placeholder="Min 8 characters"
            secureTextEntry
            autoComplete="password-new"
            textContentType="newPassword"
            maxLength={64}
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            testID="signup-password"
          />

          <Input
            ref={confirmPasswordRef}
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={handleConfirmPasswordChange}
            error={fieldErrors['confirmPassword']}
            placeholder="Re-enter your password"
            secureTextEntry
            autoComplete="password-new"
            textContentType="newPassword"
            maxLength={64}
            returnKeyType="go"
            onSubmitEditing={handleSignup}
            testID="signup-confirm-password"
          />

          <Button
            title={cooldown > 0 ? `Try again in ${cooldown}s` : loading ? 'Creating account...' : 'Create Account'}
            onPress={handleSignup}
            loading={loading && cooldown === 0}
            disabled={cooldown > 0}
            testID="signup-submit"
          />

          <Text style={styles.termsText}>
            By creating an account, you agree to our{' '}
            <Text
              style={styles.termsLink}
              accessibilityRole="link"
              onPress={() => Linking.openURL('https://playconnect.in/terms')}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              style={styles.termsLink}
              accessibilityRole="link"
              onPress={() => Linking.openURL('https://playconnect.in/privacy')}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="link"
            accessibilityLabel="Sign in to existing account"
            testID="goto-login"
          >
            <Text style={styles.footerLink}> Sign In</Text>
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
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  termsText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: fontWeights.medium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing['2xl'],
  },
  footerText: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: fontSizes.base,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },
});
