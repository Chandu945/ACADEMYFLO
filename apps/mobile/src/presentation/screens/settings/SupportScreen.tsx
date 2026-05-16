/**
 * Help & Support landing — exposes the 3 direct-support channels (email,
 * call, WhatsApp). Reachable from the More tab on every role (owner, staff,
 * parent) via a single "Help & Support" menu entry.
 *
 * Each row launches the matching deep link via Linking.openURL. The actual
 * email/phone values come from `support-contact.ts` so changing them is a
 * one-file edit. The visible contact value is rendered under the label so
 * the user knows exactly which inbox they'll reach before tapping.
 */
import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { crossAlert } from '../../utils/crossPlatformAlert';
import { Screen } from '../../components/ui/Screen';
import { AppIcon } from '../../components/ui/AppIcon';
import { useTheme } from '../../context/ThemeContext';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { SUPPORT_EMAIL, SUPPORT_PHONE_E164, SUPPORT_LINKS } from './support-contact';

type SupportChannel = {
  key: string;
  icon: string;
  label: string;
  // The user-visible contact value (e.g. the actual email address) rendered
  // under the label so the tap target is unambiguous.
  detail: string;
  url: string;
  // Friendly fallback message when no handler is registered for the link.
  fallback: string;
};

const CHANNELS: SupportChannel[] = [
  {
    key: 'support-email',
    icon: 'email-outline',
    label: 'Email Support',
    detail: SUPPORT_EMAIL,
    url: SUPPORT_LINKS.email,
    fallback:
      'No mail app is set up on this device. You can email us directly at ' +
      SUPPORT_EMAIL + '.',
  },
  {
    key: 'support-phone',
    icon: 'phone-outline',
    label: 'Call Support',
    detail: SUPPORT_PHONE_E164,
    url: SUPPORT_LINKS.phone,
    fallback:
      'This device cannot place a call. You can reach us at ' +
      SUPPORT_PHONE_E164 + '.',
  },
  {
    key: 'support-whatsapp',
    icon: 'whatsapp',
    label: 'Chat on WhatsApp',
    detail: SUPPORT_PHONE_E164,
    url: SUPPORT_LINKS.whatsapp,
    fallback:
      'Could not open WhatsApp. Please install it or message us at ' +
      SUPPORT_PHONE_E164 + '.',
  },
];

export function SupportScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const open = useCallback(async (channel: SupportChannel) => {
    try {
      await Linking.openURL(channel.url);
    } catch (e) {
      if (__DEV__) console.warn('[SupportScreen] openURL failed:', e);
      crossAlert('Cannot open link', channel.fallback);
    }
  }, []);

  return (
    <Screen edges={['bottom']}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerIcon}>
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="headset" size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.headerTitle}>We're here to help</Text>
        <Text style={styles.headerSubtitle}>
          Reach the Academyflo team directly through any of these channels.
        </Text>
      </View>

      {/* Channel cards */}
      <View style={styles.channelList}>
        {CHANNELS.map((channel) => (
          <TouchableOpacity
            key={channel.key}
            style={styles.channelCard}
            onPress={() => open(channel)}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel={`${channel.label} — ${channel.detail}`}
            testID={`support-${channel.key}`}
          >
            <View style={styles.channelIconContainer}>
              <LinearGradient
                colors={[gradient.start, gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <AppIcon name={channel.icon} size={22} color="#FFFFFF" />
            </View>
            <View style={styles.channelText}>
              <Text style={styles.channelLabel}>{channel.label}</Text>
              <Text style={styles.channelDetail} numberOfLines={1}>
                {channel.detail}
              </Text>
            </View>
            <AppIcon name="open-in-new" size={18} color={colors.textDisabled} />
          </TouchableOpacity>
        ))}
      </View>
    </Screen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    headerSection: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    headerIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    headerTitle: {
      fontSize: fontSizes['2xl'],
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: fontSizes.base,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      textAlign: 'center',
      paddingHorizontal: spacing.base,
    },
    channelList: {
      gap: spacing.md,
    },
    channelCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.base,
      ...shadows.sm,
      gap: spacing.md,
    },
    channelIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    channelText: {
      flex: 1,
      minWidth: 0,
    },
    channelLabel: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    channelDetail: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
