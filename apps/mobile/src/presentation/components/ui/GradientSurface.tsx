import React from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { gradient } from '../../theme';

type GradientSurfaceProps = ViewProps & {
  /** Override the default 135° purple→blue stops. */
  colors?: [string, string];
  /** Radius + overflow:'hidden' applied automatically when provided. */
  borderRadius?: number;
};

/**
 * Drop-in replacement for `<View style={{ backgroundColor: colors.primary }}>`
 * that paints the accent 135° linear-gradient
 *   #7C3AED (top-left) → #3B82F6 (bottom-right)
 * across the full box. Use for FABs, primary-tinted badges, selected chips,
 * pay-CTAs — anywhere a solid accent fill was used before.
 *
 * Children render on top of the gradient at their natural layout position.
 */
export function GradientSurface({
  colors: overrideColors,
  borderRadius,
  style,
  children,
  ...rest
}: GradientSurfaceProps) {
  const stops = overrideColors ?? [gradient.start, gradient.end];
  return (
    <View
      {...rest}
      style={[
        borderRadius != null && { borderRadius, overflow: 'hidden' as const },
        style,
      ]}
    >
      <LinearGradient
        colors={stops}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, borderRadius != null && ({ borderRadius } as ViewStyle)]}
      />
      {children}
    </View>
  );
}
