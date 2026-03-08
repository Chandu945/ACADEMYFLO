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

type SignupNav = NativeStackNavigationProp<AuthStackParamList, 'OwnerSignup'>;

const E164_REGEX = /^\+[1-9]\d{6,14}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function OwnerSignupScreen() {
  const navigation = useNavigation<SignupNav>();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors['fullName'] = 'Full name is required';
    if (!email.trim()) errors['email'] = 'Email is required';
    else if (!EMAIL_REGEX.test(email.trim())) errors['email'] = 'Invalid email format';
    if (!phoneNumber.trim()) errors['phoneNumber'] = 'Phone number is required';
    else if (!E164_REGEX.test(phoneNumber.trim()))
      errors['phoneNumber'] = 'Phone must be in E.164 format (e.g. +919876543210)';
    if (!password) errors['password'] = 'Password is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [fullName, email, phoneNumber, password]);

  const handleSignup = useCallback(async () => {
    setError(null);
    if (!validate()) return;

    setLoading(true);
    const err = await signup({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      password,
    });
    setLoading(false);

    if (err) {
      setError(err.message);
    }
  }, [fullName, email, phoneNumber, password, signup, validate]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Owner Signup</Text>
        <Text style={styles.subtitle}>Create your academy account</Text>
      </View>

      {error ? <InlineError message={error} /> : null}

      <Input
        label="Full Name"
        value={fullName}
        onChangeText={setFullName}
        error={fieldErrors['fullName']}
        placeholder="Enter full name"
        autoCapitalize="words"
        testID="signup-name"
      />

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors['email']}
        placeholder="Enter email"
        keyboardType="email-address"
        testID="signup-email"
      />

      <Input
        label="Phone Number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        error={fieldErrors['phoneNumber']}
        placeholder="+919876543210"
        keyboardType="phone-pad"
        testID="signup-phone"
      />

      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors['password']}
        placeholder="Min 8 characters"
        secureTextEntry
        testID="signup-password"
      />

      <Button
        title="Create Account"
        onPress={handleSignup}
        loading={loading}
        testID="signup-submit"
      />

      <View style={styles.links}>
        <Button
          title="Already have an account? Sign In"
          variant="secondary"
          onPress={() => navigation.navigate('Login')}
          testID="goto-login"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.xl,
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
  },
  links: {
    marginTop: spacing.xl,
  },
});
