import React from 'react';
import { Text, StyleSheet } from 'react-native';

import { colors, spacing, fontSizes, fontWeights } from '../../theme';

type SectionHeaderProps = {
  title: string;
};

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <Text style={styles.header} accessibilityRole="header">
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.textDark,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
});
