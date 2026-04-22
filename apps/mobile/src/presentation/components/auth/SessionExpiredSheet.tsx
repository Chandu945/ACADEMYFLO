import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppIcon } from '../ui/AppIcon';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

/**
 * Bottom-sheet prompt shown when the user's session was invalidated server-side
 * (401 past refresh). Tapping the CTA just dismisses the sheet — the login
 * screen is already rendered underneath and is ready to accept new credentials.
 */
export function SessionExpiredSheet({ visible, onDismiss }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.sheet} testID="session-expired-sheet">
          <View style={styles.dragHandle} />

          <View style={styles.body}>
            <View style={styles.iconTile}>
              <AppIcon name="lock-clock" size={32} color={colors.warningText} />
            </View>

            <Text style={styles.title} accessibilityRole="header">
              Session expired
            </Text>
            <Text style={styles.subtitle}>
              You've been signed out for your security. Log in again to pick up where you left off.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onDismiss}
            testID="session-expired-login"
            accessibilityRole="button"
            accessibilityLabel="Log in again"
            style={styles.ctaWrap}
          >
            <LinearGradient
              colors={[gradient.start, gradient.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cta}
            >
              <AppIcon name="login" size={20} color="#FFFFFF" />
              <Text style={styles.ctaText}>Log in again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.bgSubtle,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing['2xl'],
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.25, shadowRadius: 16 },
        android: { elevation: 20 },
        default: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.25, shadowRadius: 16 },
      }),
    },
    dragHandle: {
      width: 44,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: spacing.md,
      marginBottom: spacing.lg,
    },
    body: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    iconTile: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: colors.warningBg,
      borderWidth: 1,
      borderColor: colors.warningBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.base,
    },
    title: {
      fontSize: 22,
      fontWeight: fontWeights.bold,
      color: colors.text,
      textAlign: 'center',
      letterSpacing: -0.4,
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: fontSizes.md,
      color: colors.textMedium,
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 320,
      marginBottom: spacing.lg,
    },
    ctaWrap: {
      borderRadius: radius.lg,
      overflow: 'hidden',
      marginTop: spacing.xs,
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
  });
