import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';

import { spacing, fontSizes, fontWeights, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type LoadingOverlayProps = {
  /** Announced to screen readers; not rendered on screen. */
  message?: string;
};

/**
 * App-launch splash. Composition:
 *   1. Pure-black canvas.
 *   2. Centered logo with a very large, soft purple drop-shadow that doubles
 *      as a radial halo — this avoids the visible rectangular edges that
 *      stacked LinearGradient blobs produce on RN (no native radial-gradient).
 *   3. "Academy" + accent "flo" wordmark, tagline, slim bottom spinner.
 *   4. Subtle 1.4s breathing pulse on the logo so the splash feels alive.
 */
export function LoadingOverlay({ message = 'Loading Academyflo' }: LoadingOverlayProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Subtle breathing pulse on the logo tile so the splash doesn't feel static.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const pulseGlow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0.95] });

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      {/* ── Brand mark ──────────────────────────────────────────────────── */}
      <View style={styles.brand}>
        <View style={styles.logoStage}>
          {/* Soft circular glow beneath the icon — single blurred View, no
              rectangular edges. Pulses with the logo. */}
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { opacity: pulseGlow }]}
          />
          <Animated.View
            style={[
              styles.logoWrap,
              { transform: [{ scale: pulseScale }] },
            ]}
          >
            <Image
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </Animated.View>
        </View>

        <Text style={styles.wordmark} accessibilityRole="header">
          <Text style={styles.wordmarkPrimary}>Academy</Text>
          <Text style={styles.wordmarkAccent}>flo</Text>
        </Text>

        <Text style={styles.tagline}>Academy management, simplified</Text>
      </View>

      {/* ── Bottom spinner ──────────────────────────────────────────────── */}
      <View style={styles.spinner}>
        <ActivityIndicator size="small" color={gradient.end} />
      </View>
    </View>
  );
}

const GLOW_SIZE = 360;

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    brand: {
      alignItems: 'center',
    },
    /* Stage holds the icon and its centered glow — both absolute-stacked. */
    logoStage: {
      width: 120,
      height: 120,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    /* Soft purple radial-feel glow. A single circular View with low-opacity
       fill + an extreme shadow blur reads as a gradient halo without showing
       any rectangular edges (the LinearGradient approach was). */
    glow: {
      position: 'absolute',
      width: GLOW_SIZE,
      height: GLOW_SIZE,
      borderRadius: GLOW_SIZE / 2,
      backgroundColor: gradient.start,
      // On iOS / web the shadow blurs the whole circle into the bg; on
      // Android elevation shadows don't blur far enough so we lean on
      // opacity + the circle itself for the falloff.
      ...Platform.select({
        ios: {
          shadowColor: gradient.start,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.85,
          shadowRadius: 80,
          opacity: 0.18,
        },
        android: {
          opacity: 0.22,
          elevation: 0,
        },
        default: {
          // Web: layered box-shadow for a softer falloff than RN's iOS shim.
          // (RN-Web tolerates `boxShadow` even though the typings disallow it.)
          opacity: 0.22,
          ...({
            boxShadow:
              '0 0 120px 60px rgba(124,58,237,0.55), 0 0 220px 100px rgba(59,130,246,0.35)',
          } as object),
        },
      }),
    },
    logoWrap: {
      width: 108,
      height: 108,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    logo: {
      width: 108,
      height: 108,
    },

    wordmark: {
      fontSize: 32,
      fontWeight: fontWeights.heavy,
      letterSpacing: -0.8,
      lineHeight: 36,
    },
    wordmarkPrimary: {
      color: colors.text,
    },
    wordmarkAccent: {
      color: gradient.end,
    },
    tagline: {
      marginTop: spacing.sm + 2,
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      letterSpacing: 0.2,
    },

    spinner: {
      position: 'absolute',
      bottom: spacing['3xl'] + spacing.sm,
      alignSelf: 'center',
    },

    /* Legacy — kept so callers passing `message` still typecheck. */
    text: {
      marginTop: spacing.base,
      fontSize: fontSizes.lg,
      color: colors.textSecondary,
    },
  });
