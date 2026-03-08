import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing, fontSizes } from '../../theme';
import { Button } from './Button';

type EmptyStateProps = {
  message: string;
  onAction?: () => void;
  actionLabel?: string;
};

export function EmptyState({ message, onAction, actionLabel }: EmptyStateProps) {
  return (
    <View style={styles.container} testID="empty-state">
      <Text style={styles.text}>{message}</Text>
      {onAction && actionLabel ? (
        <View style={styles.actionContainer}>
          <Button title={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  text: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionContainer: {
    marginTop: spacing.base,
  },
});
