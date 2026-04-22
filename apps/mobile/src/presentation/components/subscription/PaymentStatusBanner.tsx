import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Modal,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { PaymentFlowStatus } from '../../../domain/payments/cashfree.types';
import { AppIcon } from '../ui/AppIcon';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  status: PaymentFlowStatus;
  error: string | null;
  /** Called when the user dismisses the success/failed overlay. */
  onDismiss?: () => void;
};

/* ── Processing ring loader ──────────────────────────────────────────────── */

function RingLoader({ colors }: { colors: Colors }) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    spinLoop.start();
    pulseLoop.start();
    return () => {
      spinLoop.stop();
      pulseLoop.stop();
    };
  }, [spin, pulse]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  return (
    <View style={styles.loaderWrap}>
      <View style={styles.ringOutermost} />
      <View style={styles.ringOuter} />
      <Animated.View style={[styles.arcRotator, { transform: [{ rotate }] }]}>
        <View style={styles.arc} />
      </Animated.View>
      <Animated.View
        style={[
          styles.core,
          { opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
        ]}
      >
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/* ── Result tile (success / failed) ──────────────────────────────────────── */

function ResultTile({
  variant,
  icon,
}: {
  variant: 'success' | 'failed';
  icon: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  return (
    <Animated.View style={[styles.resultTile, { transform: [{ scale }], opacity }]}>
      {variant === 'success' ? (
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.danger }]} />
      )}
      <AppIcon name={icon} size={54} color="#FFFFFF" />
    </Animated.View>
  );
}

/* ── Main overlay ────────────────────────────────────────────────────────── */

export function PaymentStatusBanner({ status, error, onDismiss }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const visible = status !== 'idle';
  const isTerminal = status === 'success' || status === 'failed';

  let body: React.ReactNode = null;

  if (status === 'initiating' || status === 'checkout' || status === 'polling') {
    const title =
      status === 'initiating'
        ? 'Preparing payment'
        : status === 'checkout'
          ? 'Complete in browser'
          : 'Confirming payment';
    const subtitle =
      status === 'initiating'
        ? 'Hold on — we\u2019re setting things up.'
        : status === 'checkout'
          ? 'Finish the payment in the Cashfree window. Keep the app open.'
          : 'We\u2019re waiting for your bank to confirm. This usually takes a few seconds — don\u2019t close the app.';

    body = (
      <>
        <RingLoader colors={colors} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </>
    );
  } else if (status === 'success') {
    body = (
      <>
        <ResultTile variant="success" icon="check-bold" />
        <Text style={styles.title}>Payment successful</Text>
        <Text style={styles.subtitle}>Your subscription is now active.</Text>
      </>
    );
  } else if (status === 'failed') {
    body = (
      <>
        <ResultTile variant="failed" icon="close-thick" />
        <Text style={styles.title}>Payment failed</Text>
        <Text style={styles.subtitle}>
          {error || 'Something went wrong. Please try again.'}
        </Text>
      </>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={isTerminal ? onDismiss : undefined}
    >
      <View style={styles.fullScreen} testID="payment-status-banner">
        <View style={styles.content}>{body}</View>
        {isTerminal && onDismiss ? (
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={onDismiss}
            activeOpacity={0.85}
            testID="payment-status-dismiss"
          >
            {status === 'success' ? (
              <LinearGradient
                colors={[gradient.start, gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgSubtle, borderRadius: radius.xl }]} />
            )}
            <Text style={styles.dismissText}>{status === 'success' ? 'Done' : 'Try again'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Modal>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */

const LOADER = 148;
const RING_OUTERMOST = 148;
const RING_OUTER = 116;
const CORE = 56;
const ARC = 132;

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    fullScreen: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xl,
      justifyContent: 'space-between',
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* Loader */
    loaderWrap: {
      width: LOADER,
      height: LOADER,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing['2xl'],
    },
    ringOutermost: {
      position: 'absolute',
      width: RING_OUTERMOST,
      height: RING_OUTERMOST,
      borderRadius: RING_OUTERMOST / 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ringOuter: {
      position: 'absolute',
      width: RING_OUTER,
      height: RING_OUTER,
      borderRadius: RING_OUTER / 2,
      borderWidth: 2,
      borderColor: colors.borderStrong,
    },
    arcRotator: {
      position: 'absolute',
      width: ARC,
      height: ARC,
      alignItems: 'center',
      justifyContent: 'center',
    },
    arc: {
      width: ARC,
      height: ARC,
      borderRadius: ARC / 2,
      borderWidth: 3,
      borderTopColor: gradient.start,
      borderRightColor: gradient.end,
      borderBottomColor: 'transparent',
      borderLeftColor: 'transparent',
    },
    core: {
      width: CORE,
      height: CORE,
      borderRadius: CORE / 2,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: gradient.start,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.7,
          shadowRadius: 24,
        },
        default: {},
      }),
    },

    /* Title / subtitle */
    title: {
      fontSize: fontSizes['3xl'],
      fontWeight: fontWeights.bold,
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: fontSizes.md,
      color: colors.textMedium,
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 340,
    },

    /* Result tile */
    resultTile: {
      width: 120,
      height: 120,
      borderRadius: 28,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing['2xl'],
      ...Platform.select({
        ios: {
          shadowColor: gradient.start,
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.4,
          shadowRadius: 28,
        },
        android: {
          elevation: 14,
        },
        default: {},
      }),
    },

    /* Dismiss button */
    dismissBtn: {
      borderRadius: radius.xl,
      overflow: 'hidden',
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dismissText: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.semibold,
      color: '#FFFFFF',
      letterSpacing: -0.2,
    },
  });
