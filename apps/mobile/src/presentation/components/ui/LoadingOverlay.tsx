import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

import { colors, spacing, fontSizes } from '../../theme';

type LoadingOverlayProps = {
  message?: string;
};

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  text: {
    marginTop: spacing.base,
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
  },
});
