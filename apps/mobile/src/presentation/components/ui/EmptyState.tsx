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
  variant?: 'empty' | 'noResults';
};

export function EmptyState({
  message,
  subtitle,
  icon,
  onAction,
  actionLabel,
  variant = 'empty',
}: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const isNoResults = variant === 'noResults';
  const resolvedIcon = icon ?? (isNoResults ? 'magnify-close' : undefined);
  const resolvedSubtitle = subtitle ?? (isNoResults ? 'Try adjusting your search or filters' : undefined);
  const iconColor = isNoResults ? colors.warning : colors.primary;
  const circleBg = isNoResults ? colors.warningBg : colors.primarySoft;

  const accessLabel = [message, resolvedSubtitle].filter(Boolean).join('. ');

  return (
    <View style={styles.container} testID="empty-state" accessibilityLabel={accessLabel}>
      {resolvedIcon && (
        <View style={[styles.iconCircle, { backgroundColor: circleBg }]}>
          {/* @ts-expect-error react-native-vector-icons types */}
          <Icon name={resolvedIcon} size={40} color={iconColor} />
        </View>
      )}
      <Text style={styles.title}>{message}</Text>
      {resolvedSubtitle && <Text style={styles.subtitle}>{resolvedSubtitle}</Text>}
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
