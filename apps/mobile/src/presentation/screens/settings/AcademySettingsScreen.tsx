import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useAcademySettings } from '../../../application/settings/use-academy-settings';
import { settingsApi } from '../../../infra/settings/settings-api';
import { SettingsForm } from '../../components/settings/SettingsForm';
import { Screen } from '../../components/ui/Screen';
import { EmptyState } from '../../components/ui/EmptyState';
import { fontSizes, fontWeights, spacing } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export function AcademySettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
          <TouchableOpacity
            onPress={refetch}
            style={styles.retryButton}
            accessibilityRole="button"
            accessibilityLabel="Retry loading settings"
            testID="settings-retry"
          >
            <Text style={styles.retryButtonText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  if (!settings) {
    return (
      <Screen>
        <EmptyState
          message="No settings available"
          subtitle="Settings could not be loaded. Please try again."
          icon="cog-off-outline"
          onAction={refetch}
          actionLabel="Retry"
        />
      </Screen>
    );
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

const makeStyles = (colors: Colors) => StyleSheet.create({
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
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.bgSubtle,
  },
  retryButtonText: {
    fontSize: fontSizes.base,
    color: colors.text,
    fontWeight: fontWeights.semibold,
  },
});
