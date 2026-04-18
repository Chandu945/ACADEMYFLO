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
      <AppIcon name="alert-circle-outline" size={16} color={colors.warningAccent} />
      <Text style={styles.text} numberOfLines={3}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} hitSlop={8} testID="retry-button">
          <AppIcon name="refresh" size={14} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningLightBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.base,
    marginVertical: spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.warningText,
    fontWeight: fontWeights.medium,
    lineHeight: 18,
  },
  retryButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
