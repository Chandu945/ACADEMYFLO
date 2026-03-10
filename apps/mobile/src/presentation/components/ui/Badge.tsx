import React, { useMemo } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';

import { spacing, fontSizes, fontWeights, radius as radii } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  testID?: string;
};

function getTintedBg(colors: Colors): Record<BadgeVariant, string> {
  return {
    success: colors.successBg,
    danger: colors.dangerBg,
    warning: colors.warningBg,
    info: colors.infoBg,
    neutral: colors.bgSubtle,
  };
}

function getTintedText(colors: Colors): Record<BadgeVariant, string> {
  return {
    success: colors.success,
    danger: colors.danger,
    warning: colors.warningText,
    info: colors.infoText,
    neutral: colors.textSecondary,
  };
}

export function Badge({ label, variant = 'neutral', testID }: BadgeProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const TINTED_BG = useMemo(() => getTintedBg(colors), [colors]);
  const TINTED_TEXT = useMemo(() => getTintedText(colors), [colors]);
  return (
    <View
      style={[styles.badge, { backgroundColor: TINTED_BG[variant] } as ViewStyle]}
      testID={testID}
    >
      <Text style={[styles.label, { color: TINTED_TEXT[variant] }]}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.3,
  },
});
