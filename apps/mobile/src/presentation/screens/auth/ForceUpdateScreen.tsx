import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { AppIcon } from '../../components/ui/AppIcon';
import { APP_VERSION } from '../../../infra/app-version';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  storeUrl: string;
  minVersion: string;
};

/**
 * Hard-blocked update screen — shown when the bundled APP_VERSION is below
 * the server's minimum required version. Only escape route is opening the
 * store URL via the gradient CTA.
 */
export function ForceUpdateScreen({ storeUrl, minVersion }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <View style={styles.iconTile}>
          <AppIcon name="refresh" size={36} color="#A78BFA" />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Update required
        </Text>
        <Text style={styles.subtitle}>
          Version {minVersion} is available with critical security fixes. You'll need to update to
          continue.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => Linking.openURL(storeUrl)}
          testID="update-button"
          accessibilityRole="button"
          accessibilityLabel="Update now"
          style={styles.ctaWrap}
        >
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <AppIcon name="download-outline" size={20} color="#FFFFFF" />
            <Text style={styles.ctaText}>Update now</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.versionLine}>
          Current {APP_VERSION} · Required {minVersion}
        </Text>
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
      backgroundColor: 'rgba(124,58,237,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(124,58,237,0.32)',
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
    },
    footer: {
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    ctaWrap: {
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadows.lg,
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
    versionLine: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
