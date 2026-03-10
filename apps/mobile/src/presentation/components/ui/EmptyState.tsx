import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { Button } from './Button';
import { useTheme } from '../../context/ThemeContext';

type EmptyStateProps = {
  message: string;
  subtitle?: string;
  icon?: string;
  onAction?: () => void;
  actionLabel?: string;
};

export function EmptyState({ message, subtitle, icon, onAction, actionLabel }: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container} testID="empty-state">
      {icon && (
        <View style={styles.iconCircle}>
          {/* @ts-expect-error react-native-vector-icons types */}
          <Icon name={icon} size={40} color={colors.primary} />
        </View>
      )}
      <Text style={styles.title}>{message}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {onAction && actionLabel ? (
        <View style={styles.actionContainer}>
          <Button title={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing['2xl'],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  actionContainer: {
    marginTop: spacing.lg,
  },
});
