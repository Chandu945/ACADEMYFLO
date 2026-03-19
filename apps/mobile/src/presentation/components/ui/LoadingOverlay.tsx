import React, { useMemo } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

import { spacing, fontSizes } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type LoadingOverlayProps = {
  message?: string;
};

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
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
