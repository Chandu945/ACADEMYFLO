import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import { fontSizes, fontWeights, radius, spacing } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type KpiTileProps = {
  label: string;
  value: number;
  format?: 'count' | 'currency';
  icon?: string;
};

function formatValue(value: number, format: 'count' | 'currency'): string {
  if (format === 'currency') {
    return `\u20B9${value.toLocaleString('en-IN')}`;
  }
  return value.toLocaleString('en-IN');
}

export const KpiTile = React.memo(function KpiTile({
  label,
  value,
  format = 'count',
  icon,
}: KpiTileProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const displayValue = formatValue(value, format);

  return (
    <View
      style={styles.tile}
      accessibilityLabel={`${label}: ${displayValue}`}
      accessibilityRole="text"
      testID={`kpi-tile-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {icon && (
        <View style={styles.iconCircle}>
          
          <AppIcon name={icon} size={16} color={colors.primary} />
        </View>
      )}
      <Text style={styles.value}>{displayValue}</Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
});

const makeStyles = (colors: Colors) => StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    minHeight: 90,
    margin: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    fontSize: 22,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
});
