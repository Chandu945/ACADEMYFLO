import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AppIcon } from '../ui/AppIcon';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import {
  cancelDeletion,
  getDeletionStatus,
  type AccountDeletionStatus,
} from '../../../infra/account/account-deletion-api';

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function PendingDeletionBanner() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigation = useNavigation<any>();
  const [pending, setPending] = useState<AccountDeletionStatus | null>(null);
  const [canceling, setCanceling] = useState(false);

  const isOwner = user?.role === 'OWNER';

  const refresh = useCallback(async () => {
    if (!isOwner) return;
    const result = await getDeletionStatus();
    if (result.ok) setPending(result.value);
  }, [isOwner]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const onCancel = useCallback(async () => {
    setCanceling(true);
    const result = await cancelDeletion();
    setCanceling(false);
    if (result.ok) {
      showToast('Deletion canceled — your academy is safe');
      setPending(null);
    } else {
      showToast(result.error.message, 'error');
    }
  }, [showToast]);

  if (!isOwner || !pending) return null;

  const days = daysUntil(pending.scheduledExecutionAt);
  const dateStr = new Date(pending.scheduledExecutionAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Severity tier: > 7 days = warning tone, ≤ 7 = critical danger tone
  const isCritical = days <= 7;

  return (
    <View
      style={styles.card}
      accessibilityRole="alert"
      accessibilityLabel={`Academy scheduled for deletion in ${days} days, on ${dateStr}`}
    >
      <View style={[styles.accentStripe, isCritical && styles.accentStripeCritical]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={[styles.countdownChip, isCritical && styles.countdownChipCritical]}>
            <Text style={[styles.countdownNumber, isCritical && styles.countdownNumberCritical]}>
              {days}
            </Text>
            <Text style={[styles.countdownLabel, isCritical && styles.countdownLabelCritical]}>
              {days === 1 ? 'day' : 'days'}
            </Text>
          </View>

          <View style={styles.headingWrap}>
            <View style={styles.iconTitle}>
              <AppIcon
                name="alert-circle"
                size={16}
                color={isCritical ? colors.danger : colors.warning}
              />
              <Text
                style={[
                  styles.eyebrow,
                  { color: isCritical ? colors.danger : colors.warning },
                ]}
              >
                {isCritical ? 'FINAL WARNING' : 'DELETION SCHEDULED'}
              </Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>
              Your academy will be permanently deleted
            </Text>
            <Text style={styles.subtitle}>
              On <Text style={styles.subtitleStrong}>{dateStr}</Text>. Cancel any time before
              then to keep all your data.
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.actions}>
          <Pressable
            onPress={() =>
              navigation.navigate('More', { screen: 'DeleteAccount' } as never)
            }
            style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
            testID="pending-deletion-details"
            accessibilityRole="link"
          >
            <Text style={styles.linkText}>View details</Text>
            <AppIcon name="chevron-right" size={16} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            onPress={onCancel}
            disabled={canceling}
            style={({ pressed }) => [
              styles.primaryBtn,
              isCritical && styles.primaryBtnCritical,
              pressed && styles.pressed,
              canceling && styles.disabled,
            ]}
            testID="pending-deletion-cancel"
            accessibilityRole="button"
            accessibilityLabel="Cancel scheduled deletion"
          >
            {canceling ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <AppIcon name="shield-check-outline" size={16} color={colors.white} />
                <Text style={styles.primaryBtnText}>Cancel deletion</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      marginBottom: spacing.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.md,
    },
    accentStripe: {
      width: 4,
      backgroundColor: colors.warning,
    },
    accentStripeCritical: {
      backgroundColor: colors.danger,
    },
    body: {
      flex: 1,
      padding: spacing.base,
      gap: spacing.md,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    countdownChip: {
      width: 64,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: colors.warningBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countdownChipCritical: {
      backgroundColor: colors.dangerBg,
    },
    countdownNumber: {
      fontSize: fontSizes['3xl'],
      fontWeight: fontWeights.bold,
      color: colors.warningText,
      lineHeight: 30,
    },
    countdownNumberCritical: {
      color: colors.danger,
    },
    countdownLabel: {
      fontSize: fontSizes.xs,
      color: colors.warningText,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginTop: 2,
    },
    countdownLabelCritical: {
      color: colors.danger,
    },
    headingWrap: {
      flex: 1,
      gap: 4,
    },
    iconTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    eyebrow: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.bold,
      letterSpacing: 0.6,
    },
    title: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      lineHeight: 22,
    },
    subtitle: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      lineHeight: 18,
      marginTop: 2,
    },
    subtitleStrong: {
      color: colors.text,
      fontWeight: fontWeights.semibold,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    linkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: spacing.xs,
      paddingHorizontal: 4,
    },
    linkText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: colors.textSecondary,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.warning,
      paddingVertical: 10,
      paddingHorizontal: spacing.base,
      borderRadius: radius.full,
    },
    primaryBtnCritical: {
      backgroundColor: colors.danger,
    },
    primaryBtnText: {
      color: colors.white,
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
    },
    pressed: {
      opacity: 0.8,
    },
    disabled: {
      opacity: 0.6,
    },
  });
