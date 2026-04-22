import React, { useMemo } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';

import { spacing, fontSizes, fontWeights, radius as radii } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'primary';
type BadgeSize = 'sm' | 'md';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Show a coloured leading dot — use for presence/status markers ("• Active"). */
  dot?: boolean;
  /** Uppercase the label with wide letter-spacing — matches enum-style statuses. */
  uppercase?: boolean;
  testID?: string;
};

type Tone = { bg: string; border: string; fg: string };

function getTones(colors: Colors): Record<BadgeVariant, Tone> {
  return {
    success: { bg: colors.successBg, border: colors.successBorder, fg: colors.successText },
    danger: { bg: colors.dangerBg, border: colors.dangerBorder, fg: colors.dangerText },
    warning: { bg: colors.warningBg, border: colors.warningBorder, fg: colors.warningText },
    info: { bg: colors.infoBg, border: 'rgba(6,182,212,0.32)', fg: colors.infoText },
    neutral: { bg: colors.bgSubtle, border: colors.border, fg: colors.textSecondary },
    primary: { bg: colors.primarySoft, border: colors.primaryLight, fg: colors.primary },
  };
}

export function Badge({
  label,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  uppercase = false,
  testID,
}: BadgeProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const TONES = useMemo(() => getTones(colors), [colors]);
  const tone = TONES[variant];
  const displayLabel = uppercase ? label.toUpperCase() : label;

  return (
    <View
      style={
        [
          styles.badge,
          size === 'md' && styles.badgeMd,
          { backgroundColor: tone.bg, borderColor: tone.border } as ViewStyle,
        ]
      }
      testID={testID}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: tone.fg }]} /> : null}
      <Text
        style={[
          styles.label,
          size === 'md' && styles.labelMd,
          uppercase && styles.labelUppercase,
          { color: tone.fg },
        ]}
        numberOfLines={1}
      >
        {displayLabel}
      </Text>
    </View>
  );
}

const makeStyles = (_colors: Colors) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radii.full,
      borderWidth: StyleSheet.hairlineWidth,
    },
    badgeMd: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    label: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      letterSpacing: 0.2,
    },
    labelMd: {
      fontSize: fontSizes.sm,
    },
    labelUppercase: {
      letterSpacing: 0.8,
      fontWeight: fontWeights.bold,
    },
  });
