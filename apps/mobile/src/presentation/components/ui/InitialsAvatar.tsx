import React, { useMemo } from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

/** Accent gradient used for default (no-photo) profile avatars. */
const GRADIENT_START = '#7C3AED';
const GRADIENT_END = '#3B82F6';

type InitialsAvatarProps = {
  /** Full name or any string — first letters of the first two words are used. */
  name: string;
  size: number;
  /** Extra style (margins, etc.). Width/height/borderRadius are set from `size`. */
  style?: ViewStyle;
  /** Override for the initials text style (font size is auto-derived if omitted). */
  textStyle?: TextStyle;
  /**
   * Shape: 'circle' (default) uses `size/2` for borderRadius; 'rounded' uses a
   * softer square (`size*0.28`) — matches the tile style used elsewhere.
   */
  shape?: 'circle' | 'rounded';
  /**
   * 'gradient' (default) fills with the accent gradient and uses white text.
   * 'solid' renders a neutral `bgSubtle` circle with muted text — quieter look
   * for profile / header avatars where the gradient competes with surrounding
   * accents.
   */
  variant?: 'gradient' | 'solid';
  testID?: string;
};

function getInitials(name: string): string {
  return (
    (name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  );
}

export function InitialsAvatar({
  name,
  size,
  style,
  textStyle,
  shape = 'circle',
  variant = 'gradient',
  testID,
}: InitialsAvatarProps) {
  const { colors } = useTheme();
  const initials = useMemo(() => getInitials(name), [name]);
  const borderRadius = shape === 'circle' ? size / 2 : Math.round(size * 0.28);
  const autoFontSize = Math.max(12, Math.round(size * 0.42));

  if (variant === 'solid') {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: colors.bgSubtle,
            borderWidth: 1,
            borderColor: colors.border,
          },
          style,
        ]}
        testID={testID}
      >
        <Text
          style={[
            styles.text,
            {
              fontSize: autoFontSize,
              letterSpacing: size >= 56 ? 0.5 : 0.2,
              color: colors.textMedium,
            },
            textStyle,
          ]}
          accessibilityLabel={name}
        >
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[GRADIENT_START, GRADIENT_END]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { width: size, height: size, borderRadius }, style]}
      testID={testID}
    >
      <Text
        style={[
          styles.text,
          { fontSize: autoFontSize, letterSpacing: size >= 56 ? 0.5 : 0.2 },
          textStyle,
        ]}
        accessibilityLabel={name}
      >
        {initials}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
