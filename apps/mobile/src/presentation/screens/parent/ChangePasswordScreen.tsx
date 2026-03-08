import React, { useState, useCallback } from 'react';
import { Text, TouchableOpacity, StyleSheet, Alert, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { changePasswordUseCase } from '../../../application/parent/use-cases/change-password.usecase';
import { parentApi } from '../../../infra/parent/parent-api';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

export function ChangePasswordScreen() {
  const navigation = useNavigation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    const result = await changePasswordUseCase(
      { currentPassword, newPassword },
      { parentApi },
    );
    setSaving(false);

    if (result.ok) {
      Alert.alert('Success', 'Password changed successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      setError(result.error.message);
    }
  }, [currentPassword, newPassword, confirmPassword, navigation]);

  return (
    <Screen>
      <Text style={styles.title}>Change Password</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Input
        label="Current Password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        testID="change-pw-current"
      />

      <Input
        label="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        testID="change-pw-new"
      />

      <Input
        label="Confirm New Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        testID="change-pw-confirm"
      />

      <TouchableOpacity
        style={[styles.submitButton, saving && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={saving}
        testID="change-pw-submit"
      >
        <Text style={styles.submitButtonText}>
          {saving ? 'Changing...' : 'Change Password'}
        </Text>
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
  errorText: {
    color: colors.danger,
    fontSize: fontSizes.sm,
    marginBottom: spacing.base,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.base,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
  },
});
