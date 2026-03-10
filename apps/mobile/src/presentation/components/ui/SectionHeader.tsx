import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';

import { spacing, fontSizes, fontWeights } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type SectionHeaderProps = {
  title: string;
};

export function SectionHeader({ title }: SectionHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Text style={styles.header} accessibilityRole="header">
      {title}
    </Text>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  header: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.textDark,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
});
