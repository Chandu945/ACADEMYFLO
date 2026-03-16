import React from 'react';
import { View, Platform } from 'react-native';
import type { ViewStyle, StyleProp } from 'react-native';

type GradientViewProps = {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/**
 * Cross-platform gradient view.
 * - Native (Android/iOS): uses react-native-linear-gradient
 * - Web: uses CSS linear-gradient via inline style
 */
export function GradientView({ colors, start, end, style, children }: GradientViewProps) {
  if (Platform.OS === 'web') {
    const angle = computeAngle(start, end);
    const colorStops = colors.join(', ');
    const webStyle = {
      backgroundImage: `linear-gradient(${angle}deg, ${colorStops})`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    return (
      <View style={[style, webStyle]}>
        {children}
      </View>
    );
  }

  // Native: use react-native-linear-gradient
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const LinearGradient = require('react-native-linear-gradient').default;
  return (
    <LinearGradient colors={colors} start={start} end={end} style={style}>
      {children}
    </LinearGradient>
  );
}

/** Convert start/end points to CSS angle in degrees */
function computeAngle(
  start?: { x: number; y: number },
  end?: { x: number; y: number },
): number {
  const sx = start?.x ?? 0;
  const sy = start?.y ?? 0;
  const ex = end?.x ?? 0;
  const ey = end?.y ?? 1;
  const dx = ex - sx;
  const dy = ey - sy;
  const rad = Math.atan2(dx, dy);
  return Math.round((rad * 180) / Math.PI);
}
