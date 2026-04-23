import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';

import { spacing, fontSizes, fontWeights, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type LoadingOverlayProps = {
  /** Announced to screen readers; not rendered on screen. */
  message?: string;
};

/**
 * App-launch splash. Cross-platform safe — no platform-specific shadow blur
 * (Android can't blur shadows the way iOS / web can, which made the previous
 * "halo" render as a hard-edged purple disc on physical devices).
 *
 * Composition:
 *   1. Logo on a clean rounded tile that respects the asset's white square.
 *   2. Three staggered "radar pulse" rings — pure border + scale + opacity
 *      animation, identical on every platform.
 *   3. Wordmark + tagline.
 *   4. Three gradient dots pulsing in sequence as the loader.
 */
export function LoadingOverlay({ message = 'Loading Academyflo' }: LoadingOverlayProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Three radar rings on staggered loops for a continuous halo.
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;
  const r3 = useRef(new Animated.Value(0)).current;

  // Three loader dots pulsing in sequence.
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;

  // Subtle breathing on the logo tile itself.
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ringLoop = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 2400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );

    const dotLoop = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 480,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 480,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(360),
        ]),
      );

    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const animations = [
      ringLoop(r1, 0),
      ringLoop(r2, 800),
      ringLoop(r3, 1600),
      dotLoop(d1, 0),
      dotLoop(d2, 160),
      dotLoop(d3, 320),
      breatheLoop,
    ];
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [r1, r2, r3, d1, d2, d3, breathe]);

  const ringStyle = (val: Animated.Value) => ({
    transform: [
      { scale: val.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) },
    ],
    opacity: val.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.45, 0] }),
  });

  const dotStyle = (val: Animated.Value) => ({
    transform: [
      { scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) },
    ],
    opacity: val.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
  });

  const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      <View style={styles.brand}>
        <View style={styles.logoStage}>
          {/* Animated radar rings */}
          <Animated.View pointerEvents="none" style={[styles.pulseRing, ringStyle(r1)]} />
          <Animated.View pointerEvents="none" style={[styles.pulseRing, ringStyle(r2)]} />
          <Animated.View pointerEvents="none" style={[styles.pulseRing, ringStyle(r3)]} />

          {/* Static thin halo for a layered look (works on Android too) */}
          <View pointerEvents="none" style={styles.staticRing} />

          {/* Logo tile */}
          <Animated.View style={[styles.logoTile, { transform: [{ scale: breatheScale }] }]}>
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

      {/* Bottom loader — three gradient dots pulsing in sequence */}
      <View style={styles.loader}>
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, styles.dotPrimary, dotStyle(d1)]} />
          <Animated.View style={[styles.dot, styles.dotMid, dotStyle(d2)]} />
          <Animated.View style={[styles.dot, styles.dotAccent, dotStyle(d3)]} />
        </View>
        <Text style={styles.loaderText}>Loading</Text>
      </View>
    </View>
  );
}

const TILE = 116;

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brand: {
      alignItems: 'center',
    },
    logoStage: {
      width: TILE,
      height: TILE,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    pulseRing: {
      position: 'absolute',
      width: TILE,
      height: TILE,
      borderRadius: TILE / 2,
      borderWidth: 1.5,
      borderColor: gradient.start,
    },
    staticRing: {
      position: 'absolute',
      width: TILE + 32,
      height: TILE + 32,
      borderRadius: (TILE + 32) / 2,
      borderWidth: 1,
      borderColor: 'rgba(124,58,237,0.18)',
    },
    logoTile: {
      width: TILE,
      height: TILE,
      borderRadius: 28,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    logo: {
      width: TILE - 8,
      height: TILE - 8,
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

    loader: {
      position: 'absolute',
      bottom: spacing['3xl'] + spacing.sm,
      alignSelf: 'center',
      alignItems: 'center',
      gap: spacing.sm,
    },
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    dotPrimary: {
      backgroundColor: gradient.start,
    },
    dotMid: {
      backgroundColor: '#5B6BD6',
    },
    dotAccent: {
      backgroundColor: gradient.end,
    },
    loaderText: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      fontWeight: fontWeights.semibold,
    },

    /* Legacy — kept so callers passing `message` still typecheck. */
    text: {
      marginTop: spacing.base,
      fontSize: fontSizes.lg,
      color: colors.textSecondary,
    },
  });
