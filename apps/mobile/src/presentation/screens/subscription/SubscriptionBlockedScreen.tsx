import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export function SubscriptionBlockedScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { subscription, logout, refreshSubscription } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSubscription();
    setRefreshing(false);
  }, [refreshSubscription]);

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <Text style={styles.icon}>!</Text>
        <Text style={styles.title}>Subscription {subscription?.status ?? 'Blocked'}</Text>

        {subscription?.blockReason ? (
          <Text style={styles.reason}>{subscription.blockReason}</Text>
        ) : null}

        {subscription?.daysRemaining !== undefined ? (
          <Text style={styles.info}>Days remaining: {subscription.daysRemaining}</Text>
        ) : null}

        <Text style={styles.body}>
          Your subscription does not allow access to the app. Please contact the administrator or
          renew your subscription.
        </Text>

        <View style={styles.actions}>
          <Button
            title="Refresh Status"
            onPress={handleRefresh}
            loading={refreshing}
            testID="blocked-refresh"
          />
          <View style={styles.spacer} />
          <Button title="Sign Out" variant="secondary" onPress={logout} testID="blocked-logout" />
        </View>
      </View>
    </Screen>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  icon: {
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.bold,
    color: colors.danger,
    marginBottom: spacing.base,
    width: 72,
    height: 72,
    lineHeight: 72,
    textAlign: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.dangerBg,
    overflow: 'hidden',
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  reason: {
    fontSize: fontSizes.md,
    color: colors.dangerText,
    backgroundColor: colors.dangerBg,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    textAlign: 'center',
    width: '100%',
  },
  info: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  body: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  actions: {
    width: '100%',
  },
  spacer: {
    height: spacing.md,
  },
});
