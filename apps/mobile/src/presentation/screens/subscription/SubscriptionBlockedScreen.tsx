import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { AppIcon } from '../../components/ui/AppIcon';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

function formatExpiryDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return null;
  }
}

export function SubscriptionBlockedScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, subscription, logout, refreshSubscription } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const isParent = user?.role === 'PARENT';
  const expiryDate = formatExpiryDate(subscription?.paidEndAt ?? subscription?.trialEndAt);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSubscription();
    setRefreshing(false);
  }, [refreshSubscription]);

  const title = isParent ? 'Academy unavailable' : 'Subscription expired';
  const subtitle = isParent
    ? expiryDate
      ? `The academy's plan ended on ${expiryDate}. Please contact the academy to restore access.`
      : "The academy's subscription is no longer active. Please contact the academy to restore access."
    : expiryDate
      ? `Your academy's plan ended on ${expiryDate}. Ask the owner to renew to continue using the app.`
      : "Your academy's subscription has expired. Ask the owner to renew to continue using the app.";

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.body}>
        <View style={styles.iconTile}>
          <AppIcon name="lock-outline" size={36} color={colors.warningText} />
        </View>

        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {/* Last active card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Last active</Text>
            <Text style={styles.cardValue} numberOfLines={1}>
              {expiryDate ?? '—'}
            </Text>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Signed in as</Text>
            <Text style={styles.cardValue} numberOfLines={1}>
              {user?.role === 'STAFF' ? 'Staff' : user?.role === 'PARENT' ? 'Parent' : user?.fullName ?? '—'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleRefresh}
          disabled={refreshing}
          testID="blocked-refresh"
          accessibilityRole="button"
          accessibilityLabel="Try again"
          style={[styles.ctaWrap, refreshing && styles.ctaDisabled]}
        >
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <AppIcon name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.ctaText}>Try again</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={logout}
          testID="blocked-logout"
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={styles.linkBtn}
        >
          <Text style={styles.linkText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: spacing.xl,
    },
    body: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: spacing['3xl'],
    },
    iconTile: {
      width: 96,
      height: 96,
      borderRadius: 24,
      backgroundColor: colors.warningBg,
      borderWidth: 1,
      borderColor: colors.warningBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: 28,
      fontWeight: fontWeights.bold,
      color: colors.text,
      textAlign: 'center',
      letterSpacing: -0.6,
      marginBottom: spacing.md,
    },
    subtitle: {
      fontSize: fontSizes.md,
      color: colors.textMedium,
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 320,
      marginBottom: spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.base,
    },
    cardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    cardLabel: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
    },
    cardValue: {
      flex: 1,
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      textAlign: 'right',
      marginLeft: spacing.base,
    },
    cardDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    footer: {
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    ctaWrap: {
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadows.lg,
    },
    ctaDisabled: {
      opacity: 0.7,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: 16,
    },
    ctaText: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.semibold,
      color: '#FFFFFF',
      letterSpacing: -0.2,
    },
    linkBtn: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    linkText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: colors.textMedium,
    },
  });
