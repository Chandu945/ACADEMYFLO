import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';

import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Severity = 'error' | 'warning' | 'info';

type InlineErrorProps = {
  message: string;
  onRetry?: () => void;
  severity?: Severity;
  title?: string;
  /** Removes outer horizontal margin so the card can be flush inside a form card. */
  compact?: boolean;
};

type Tone = {
  bg: string;
  border: string;
  iconColor: string;
  titleColor: string;
  textColor: string;
  icon: string;
};

function getTone(colors: Colors, severity: Severity): Tone {
  if (severity === 'warning') {
    return {
      bg: colors.warningLightBg,
      border: colors.warningBorder,
      iconColor: colors.warningAccent,
      titleColor: colors.warningText,
      textColor: colors.warningText,
      icon: 'alert-outline',
    };
  }
  if (severity === 'info') {
    return {
      bg: colors.infoBg,
      border: colors.info,
      iconColor: colors.info,
      titleColor: colors.infoText,
      textColor: colors.infoText,
      icon: 'information-outline',
    };
  }
  return {
    bg: colors.dangerBg,
    border: colors.dangerBorder,
    iconColor: colors.danger,
    titleColor: colors.dangerText,
    textColor: colors.dangerText,
    icon: 'alert-circle-outline',
  };
}

export function InlineError({ message, onRetry, severity = 'error', title, compact }: InlineErrorProps) {
  const { colors } = useTheme();
  const tone = useMemo(() => getTone(colors, severity), [colors, severity]);
  const styles = useMemo(() => makeStyles(colors, tone, !!compact), [colors, tone, compact]);

  const hasTitle = !!title;

  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <AppIcon name={tone.icon} size={18} color={tone.iconColor} />
      <View style={styles.body}>
        {hasTitle ? <Text style={styles.title} numberOfLines={2}>{title}</Text> : null}
        <Text style={[styles.message, hasTitle && styles.messageSecondary]} numberOfLines={4}>
          {message}
        </Text>
      </View>
      {onRetry ? (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          hitSlop={8}
          testID="retry-button"
          accessibilityRole="button"
          accessibilityLabel="Try again"
          activeOpacity={0.8}
        >
          <AppIcon name="refresh" size={13} color={tone.iconColor} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Colors, tone: Tone, compact: boolean) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: tone.bg,
    borderWidth: 1,
    borderColor: tone.border,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: compact ? 0 : spacing.base,
    marginVertical: spacing.sm,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSizes.sm,
    color: tone.titleColor,
    fontWeight: fontWeights.semibold,
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  message: {
    fontSize: fontSizes.sm,
    color: tone.textColor,
    fontWeight: fontWeights.medium,
    lineHeight: 18,
  },
  messageSecondary: {
    fontWeight: fontWeights.normal,
    opacity: 0.9,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: tone.border,
  },
  retryText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: tone.iconColor,
    letterSpacing: -0.1,
  },
});
