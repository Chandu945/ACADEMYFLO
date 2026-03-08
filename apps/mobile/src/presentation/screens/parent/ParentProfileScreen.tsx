import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { getParentProfileUseCase } from '../../../application/parent/use-cases/get-parent-profile.usecase';
import { updateParentProfileUseCase } from '../../../application/parent/use-cases/update-parent-profile.usecase';
import { parentApi } from '../../../infra/parent/parent-api';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

type Nav = NativeStackNavigationProp<MoreStackParamList, 'ParentProfile'>;

export function ParentProfileScreen() {
  const navigation = useNavigation<Nav>();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const result = await getParentProfileUseCase({ parentApi });
    if (result.ok) {
      setFullName(result.value.fullName);
      setEmail(result.value.email);
      setPhoneNumber(result.value.phoneNumber);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    const result = await updateParentProfileUseCase(
      { fullName: fullName.trim(), phoneNumber: phoneNumber.trim() },
      { parentApi },
    );
    setSaving(false);
    if (result.ok) {
      Alert.alert('Success', 'Profile updated successfully');
    } else {
      setError(result.error.message);
    }
  }, [fullName, phoneNumber]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text>Loading...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>My Profile</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Input
        label="Full Name"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        testID="profile-fullname"
      />

      <Input
        label="Email"
        value={email}
        onChangeText={() => {}}
        keyboardType="email-address"
        testID="profile-email"
      />
      <Text style={styles.readOnlyHint}>Email cannot be changed</Text>

      <Input
        label="Phone Number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        testID="profile-phone"
      />

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
        testID="profile-save"
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.changePasswordButton}
        onPress={() => navigation.navigate('ChangePassword')}
        testID="profile-change-password"
      >
        <Text style={styles.changePasswordText}>Change Password</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: {
    color: colors.danger,
    fontSize: fontSizes.sm,
    marginBottom: spacing.base,
  },
  readOnlyHint: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    marginTop: -spacing.sm,
    marginBottom: spacing.base,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.base,
    alignItems: 'center',
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
    marginTop: spacing.lg,
    alignItems: 'center',
    padding: spacing.base,
  },
  changePasswordText: {
    color: colors.primary,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.medium,
  },
});
