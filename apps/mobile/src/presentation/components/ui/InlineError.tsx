import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing, fontSizes, radius } from '../../theme';
import { Button } from './Button';

type InlineErrorProps = {
  message: string;
  onRetry?: () => void;
};

export function InlineError({ message, onRetry }: InlineErrorProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
      {onRetry ? (
        <View style={styles.retryContainer}>
          <Button title="Retry" variant="secondary" onPress={onRetry} testID="retry-button" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md,
    padding: spacing.base,
    marginVertical: spacing.md,
  },
  text: {
    fontSize: fontSizes.base,
    color: colors.dangerText,
  },
  retryContainer: {
    marginTop: spacing.md,
    alignItems: 'flex-start' as const,
  },
});
