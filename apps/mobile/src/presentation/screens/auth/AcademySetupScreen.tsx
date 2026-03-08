import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/InlineError';
import { colors, spacing, fontSizes, fontWeights } from '../../theme';

const PINCODE_REGEX = /^\d{6}$/;

export function AcademySetupScreen() {
  const { setupAcademy, logout } = useAuth();

  const [academyName, setAcademyName] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!academyName.trim()) errors['academyName'] = 'Academy name is required';
    if (!line1.trim()) errors['line1'] = 'Address line 1 is required';
    if (!city.trim()) errors['city'] = 'City is required';
    if (!state.trim()) errors['state'] = 'State is required';
    if (!pincode.trim()) errors['pincode'] = 'Pincode is required';
    else if (!PINCODE_REGEX.test(pincode.trim())) errors['pincode'] = 'Pincode must be 6 digits';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [academyName, line1, city, state, pincode]);

  const handleSetup = useCallback(async () => {
    setError(null);
    if (!validate()) return;

    setLoading(true);
    const err = await setupAcademy({
      academyName: academyName.trim(),
      address: {
        line1: line1.trim(),
        line2: line2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        country: 'India',
      },
    });
    setLoading(false);

    if (err) {
      setError(err.message);
    }
  }, [academyName, line1, line2, city, state, pincode, setupAcademy, validate]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Set Up Your Academy</Text>
        <Text style={styles.subtitle}>Complete your registration</Text>
      </View>

      {error ? <InlineError message={error} /> : null}

      <Input
        label="Academy Name"
        value={academyName}
        onChangeText={setAcademyName}
        error={fieldErrors['academyName']}
        placeholder="e.g. Sunrise Dance Academy"
        autoCapitalize="words"
        testID="setup-name"
      />

      <Input
        label="Address Line 1"
        value={line1}
        onChangeText={setLine1}
        error={fieldErrors['line1']}
        placeholder="Street address"
        testID="setup-line1"
      />

      <Input
        label="Address Line 2 (Optional)"
        value={line2}
        onChangeText={setLine2}
        placeholder="Floor, suite, etc."
        testID="setup-line2"
      />

      <Input
        label="City"
        value={city}
        onChangeText={setCity}
        error={fieldErrors['city']}
        placeholder="City"
        autoCapitalize="words"
        testID="setup-city"
      />

      <Input
        label="State"
        value={state}
        onChangeText={setStateName}
        error={fieldErrors['state']}
        placeholder="State"
        autoCapitalize="words"
        testID="setup-state"
      />

      <Input
        label="Pincode"
        value={pincode}
        onChangeText={setPincode}
        error={fieldErrors['pincode']}
        placeholder="6-digit pincode"
        keyboardType="number-pad"
        testID="setup-pincode"
      />

      <Button
        title="Complete Setup"
        onPress={handleSetup}
        loading={loading}
        testID="setup-submit"
      />

      <View style={styles.logoutRow}>
        <Button title="Sign Out" variant="secondary" onPress={logout} testID="setup-logout" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.base,
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
  logoutRow: {
    marginTop: spacing.xl,
  },
});
