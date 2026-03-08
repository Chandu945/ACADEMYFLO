import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useAcademySettings } from '../../../application/settings/use-academy-settings';
import { settingsApi } from '../../../infra/settings/settings-api';
import { SettingsForm } from '../../components/settings/SettingsForm';
import { Screen } from '../../components/ui/Screen';
import { colors, fontSizes, fontWeights, spacing } from '../../theme';

export function AcademySettingsScreen() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const { settings, loading, saving, error, update, refetch } = useAcademySettings(settingsApi);

  if (loading) {
    return (
      <Screen>
        <View style={styles.center} testID="settings-loading">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </Screen>
    );
  }

  if (error && !settings) {
    return (
      <Screen>
        <View style={styles.center} testID="settings-error">
          <Text style={styles.errorText}>{error.message}</Text>
          <Text style={styles.retryLink} onPress={refetch} testID="settings-retry">
            Tap to retry
          </Text>
        </View>
      </Screen>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <Screen>
      <SettingsForm
        settings={settings}
        editable={isOwner}
        saving={saving}
        error={error}
        onSave={update}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.base,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: fontSizes.lg,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryLink: {
    fontSize: fontSizes.base,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },
});
