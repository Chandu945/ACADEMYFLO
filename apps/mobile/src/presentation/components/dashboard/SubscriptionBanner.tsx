import React, { useMemo } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

/**
 * Inline banner (NOT a modal/alert) shown only on Owner screens when:
 * - TRIAL with 1 day left
 * - TRIAL ended (0 days)
 * - EXPIRED_GRACE countdown: 3, 2, 1 days
 * - BLOCKED
 *
 * Tapping navigates to the Subscription screen.
 * Only visible for OWNER role.
 */
export function SubscriptionBanner() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { subscription, user } = useAuth();
  const navigation = useNavigation();

  // Only show for owners
  if (!subscription || user?.role !== 'OWNER') return null;

  const { status, daysRemaining } = subscription;

  let message: string | null = null;
  let icon = 'alert-circle-outline';

  if (status === 'ACTIVE_PAID' && daysRemaining <= 3) {
    icon = 'calendar-alert';
    if (daysRemaining === 3) {
      message = 'Your subscription expires in 3 days. Please renew to continue.';
    } else if (daysRemaining === 2) {
      message = 'Your subscription expires in 2 days. Please renew to continue.';
    } else if (daysRemaining === 1) {
      message = 'Your subscription expires tomorrow. Please renew now.';
    } else {
      message = 'Your subscription expires today. Please renew now.';
    }
  } else if (status === 'TRIAL' && daysRemaining <= 1) {
    icon = 'timer-sand';
    if (daysRemaining <= 0) {
      message = 'Your free trial has ended. Subscribe now to continue.';
    } else {
      message = 'Your free trial ends tomorrow. Subscribe now to continue.';
    }
  } else if (status === 'BLOCKED') {
    icon = 'lock-outline';
    message = 'Your access has been blocked. Please renew your subscription.';
  }

  if (!message) return null;

  const handlePress = () => {
    (navigation as any).navigate('More', { screen: 'Subscription' });
  };

  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={message}
      testID="subscription-banner"
    >
      <AppIcon name={icon} size={20} color={colors.dangerText} />
      <Text style={[styles.text, { color: colors.dangerText }]}>{message}</Text>
      <AppIcon name="chevron-right" size={18} color={colors.dangerText} />
    </TouchableOpacity>
  );
}

const makeStyles = (_colors: Colors) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderLeftWidth: 4,
      marginBottom: spacing.md,
    },
    text: {
      flex: 1,
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      lineHeight: 18,
    },
  });
