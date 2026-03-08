import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/InlineError';
import { colors, spacing, fontSizes, fontWeights } from '../../theme';

type LoginNav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<LoginNav>();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!identifier.trim()) errors['identifier'] = 'Email or phone is required';
    if (!password) errors['password'] = 'Password is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [identifier, password]);

  const handleLogin = useCallback(async () => {
    setError(null);
    if (!validate()) return;

    setLoading(true);
    const err = await login(identifier.trim(), password);
    setLoading(false);

    if (err) {
      setError(err.message);
    }
  }, [identifier, password, login, validate]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>PlayConnect</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>
      </View>

      {error ? <InlineError message={error} /> : null}

      <Input
        label="Email or Phone"
        value={identifier}
        onChangeText={setIdentifier}
        error={fieldErrors['identifier']}
        placeholder="Enter email or phone"
        keyboardType="email-address"
        testID="login-identifier"
      />

      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors['password']}
        placeholder="Enter password"
        secureTextEntry
        testID="login-password"
      />

      <Button title="Sign In" onPress={handleLogin} loading={loading} testID="login-submit" />

      <View style={styles.links}>
        <Button
          title="Create Owner Account"
          variant="secondary"
          onPress={() => navigation.navigate('OwnerSignup')}
          testID="goto-signup"
        />
        <View style={styles.spacer} />
        <Button
          title="Forgot Password?"
          variant="secondary"
          onPress={() => navigation.navigate('ForgotPassword')}
          testID="goto-forgot"
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
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  links: {
    marginTop: spacing.xl,
  },
  spacer: {
    height: spacing.md,
  },
});
