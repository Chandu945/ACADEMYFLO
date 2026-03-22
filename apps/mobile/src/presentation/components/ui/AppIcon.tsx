import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type AppIconProps = {
  name: string;
  size: number;
  color: string;
  style?: StyleProp<TextStyle>;
};

/**
 * Typed wrapper around MaterialCommunityIcons that absorbs the
 * react-native-vector-icons / @types/react@19 type mismatch in one place,
 * eliminating the need for @ts-expect-error throughout the codebase.
 */
export function AppIcon({ name, size, color, style }: AppIconProps) {
  const IconComponent = MaterialCommunityIcons as unknown as React.ComponentType<AppIconProps>;
  return <IconComponent name={name} size={size} color={color} style={style} />;
}
