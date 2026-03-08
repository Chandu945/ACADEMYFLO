import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';

import { colors, spacing, fontSizes, fontWeights, radius as radii } from '../../theme';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  testID?: string;
};

const TINTED_BG: Record<BadgeVariant, string> = {
  success: colors.successBg,
  danger: colors.dangerBg,
  warning: colors.warningBg,
  info: colors.infoBg,
  neutral: colors.bgSubtle,
};

const TINTED_TEXT: Record<BadgeVariant, string> = {
  success: colors.success,
  danger: colors.danger,
  warning: colors.warningText,
  info: colors.infoText,
  neutral: colors.textSecondary,
};

export function Badge({ label, variant = 'neutral', testID }: BadgeProps) {
  return (
    <View
      style={[styles.badge, { backgroundColor: TINTED_BG[variant] } as ViewStyle]}
      testID={testID}
    >
      <Text style={[styles.label, { color: TINTED_TEXT[variant] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.base,
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
});
