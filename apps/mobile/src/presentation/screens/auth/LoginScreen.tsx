import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
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
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/InlineError';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type LoginNav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const PHONE_RE = /^\d{10,15}$/;
const RATE_LIMIT_COOLDOWN_S = 30;

export function LoginScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<LoginNav>();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [cooldown, setCooldown] = useState(0);

  const passwordRef = useRef<TextInput>(null);
  const submittingRef = useRef(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const keyboardType = useMemo(() => {
    const trimmed = identifier.trim();
    if (/^[+\d]/.test(trimmed)) return 'phone-pad' as const;
    return 'email-address' as const;
  }, [identifier]);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleIdentifierChange = useCallback((text: string) => {
    setIdentifier(text);
    clearFieldError('identifier');
    if (error) setError(null);
  }, [clearFieldError, error]);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
    clearFieldError('password');
    if (error) setError(null);
  }, [clearFieldError, error]);

  /** Normalise phone identifiers by stripping formatting characters. */
  const normaliseIdentifier = useCallback((raw: string): string => {
    const trimmed = raw.trim();
    if (trimmed.includes('@')) return trimmed;
    return trimmed.replace(/[\s\-+()]/g, '');
  }, []);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    const trimmed = identifier.trim();

    if (!trimmed) {
      errors['identifier'] = 'Email or phone is required';
    } else if (trimmed.includes('@')) {
      if (!EMAIL_RE.test(trimmed)) {
        errors['identifier'] = 'Please enter a valid email address';
      }
    } else if (!PHONE_RE.test(trimmed.replace(/[\s\-+()]/g, ''))) {
      errors['identifier'] = 'Please enter a valid email or phone number';
    }

    if (!password) {
      errors['password'] = 'Password is required';
    } else if (password.length < 6) {
      errors['password'] = 'Password must be at least 6 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [identifier, password]);

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

  const handleLogin = useCallback(async () => {
    if (submittingRef.current || cooldown > 0) return;
    Keyboard.dismiss();
    setError(null);
    if (!validate()) return;

    submittingRef.current = true;
    setLoading(true);
    try {
      const result = await login(normaliseIdentifier(identifier), password);
      if (result) {
        if (result.code === 'RATE_LIMITED') {
          setError(result.message);
          startCooldown();
        } else {
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors);
          }
          setError(result.message);
        }
      }
    } catch {
      if (__DEV__) console.error('[LoginScreen] Unexpected login error');
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }, [login, validate, identifier, password, normaliseIdentifier, cooldown, startCooldown]);

  // Cleanup cooldown interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  return (
    <Screen scroll={false} style={styles.screen}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <Pressable style={styles.container} onPress={Platform.OS !== 'web' ? Keyboard.dismiss : undefined} accessible={false}>
        {/* Logo / Brand Section */}
        <View style={styles.brandSection}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandName} accessibilityRole="header">Academyflo</Text>
          <Text style={styles.tagline}>Academy Management, Simplified</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to continue</Text>

          {error ? <InlineError message={error} /> : null}

          <Input
            label="Email or Phone"
            value={identifier}
            onChangeText={handleIdentifierChange}
            error={fieldErrors['identifier']}
            placeholder="Enter email or phone"
            keyboardType={keyboardType}
            autoComplete="username"
            textContentType="username"
            maxLength={100}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            testID="login-identifier"
          />

          <Input
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={handlePasswordChange}
            error={fieldErrors['password']}
            placeholder="Enter password"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            maxLength={64}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            testID="login-password"
          />

          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => navigation.navigate('ForgotPassword')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="link"
            accessibilityLabel="Forgot password"
            testID="goto-forgot"
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Button
            title={cooldown > 0 ? `Try again in ${cooldown}s` : loading ? 'Signing in...' : 'Sign In'}
            onPress={handleLogin}
            loading={loading && cooldown === 0}
            disabled={cooldown > 0}
            testID="login-submit"
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('OwnerSignup')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="link"
            accessibilityLabel="Create a new account"
            testID="goto-signup"
          >
            <Text style={styles.footerLink}> Create Account</Text>
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
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
    overflow: 'hidden',
    ...shadows.lg,
  },
  logoImage: {
    width: 88,
    height: 88,
  },
  brandName: {
    fontSize: 32,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.lg,
  },
  cardTitle: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  forgotText: {
    fontSize: fontSizes.sm,
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
