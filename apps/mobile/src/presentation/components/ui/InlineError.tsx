import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';

import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type InlineErrorProps = {
  message: string;
  onRetry?: () => void;
};

export function InlineError({ message, onRetry }: InlineErrorProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <AppIcon name="alert-circle-outline" size={18} color={colors.danger} />
        </View>
        <Text style={styles.text}>{message}</Text>
      </View>
      {onRetry ? (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} testID="retry-button">
          <AppIcon name="refresh" size={14} color={colors.primary} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.dangerText,
    fontWeight: fontWeights.medium,
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
  },
  retryText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
});
