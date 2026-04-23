import React, { useEffect, useMemo, useRef } from 'react';
import { View, Pressable, StyleSheet, Animated, Easing, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type GradientSwitchProps = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
};

const TRACK_W = 52;
const TRACK_H = 30;
const THUMB = 24;
const PAD = (TRACK_H - THUMB) / 2;

/**
 * Branded on/off switch. Track fills with the app's purple→blue gradient when
 * ON and shows a muted subtle-bg capsule when OFF. Thumb animates with a soft
 * spring and carries a small drop shadow so it reads as a physical disc.
 */
export function GradientSwitch({
  value,
  onValueChange,
  disabled,
  testID,
  accessibilityLabel,
}: GradientSwitchProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Drives thumb position (native driver — transform).
  const pos = useRef(new Animated.Value(value ? 1 : 0)).current;
  // Drives gradient opacity (can't use native driver with opacity on
  // LinearGradient wrapped with absoluteFill consistently across platforms,
  // so a JS-driven crossfade keeps behaviour identical everywhere).
  const fade = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(pos, {
        toValue: value ? 1 : 0,
        friction: 8,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: value ? 1 : 0,
        duration: 180,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [value, pos, fade]);

  const translateX = pos.interpolate({
    inputRange: [0, 1],
    outputRange: [PAD, TRACK_W - THUMB - PAD],
  });

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[
        styles.track,
        { opacity: disabled ? 0.5 : 1 },
      ]}
      hitSlop={8}
    >
      {/* OFF-state track bg is the Pressable itself via `track` style. */}
      {/* Gradient fades in as ON. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, styles.trackOn, { opacity: fade }]}
      >
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.thumb,
          { transform: [{ translateX }] },
        ]}
      />
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    track: {
      width: TRACK_W,
      height: TRACK_H,
      borderRadius: TRACK_H / 2,
      backgroundColor: colors.bgSubtle,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    trackOn: {
      borderRadius: TRACK_H / 2,
    },
    thumb: {
      position: 'absolute',
      top: PAD,
      left: 0,
      width: THUMB,
      height: THUMB,
      borderRadius: THUMB / 2,
      backgroundColor: '#FFFFFF',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.18,
          shadowRadius: 2,
        },
        android: { elevation: 2 },
        default: {},
      }),
    },
  });
