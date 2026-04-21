import React from 'react';
import { View } from 'react-native';

// Web stub for react-native-linear-gradient.
// Renders a View with a CSS linear-gradient background, matching the native
// component's `colors`, `start`, and `end` props closely enough for dev-mode
// visual parity.

function toCssColor(c) {
  return typeof c === 'string' ? c : String(c);
}

function computeAngleDeg(start, end) {
  const s = start || { x: 0, y: 0 };
  const e = end || { x: 0, y: 1 };
  const dx = (e.x ?? 0) - (s.x ?? 0);
  const dy = (e.y ?? 1) - (s.y ?? 0);
  // CSS 0deg = up; gradient math here maps {0,0}->{0,1} (top→bottom) to 180deg
  const rad = Math.atan2(dx, -dy);
  return (rad * 180) / Math.PI;
}

export default function LinearGradient({ colors, start, end, style, children, ...rest }) {
  const angle = computeAngleDeg(start, end);
  const stops = (colors || []).map(toCssColor).join(', ');
  const gradientStyle = {
    backgroundImage: `linear-gradient(${angle}deg, ${stops})`,
  };
  return (
    <View {...rest} style={[style, gradientStyle]}>
      {children}
    </View>
  );
}

export { LinearGradient };
