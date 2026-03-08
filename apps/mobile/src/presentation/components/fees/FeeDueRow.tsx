import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { FeeDueItem } from '../../../domain/fees/fees.types';
import { Badge } from '../ui/Badge';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

type FeeDueRowProps = {
  item: FeeDueItem;
  onPress: () => void;
  showStudentName?: boolean;
  studentName?: string;
};

const STATUS_VARIANT: Record<string, 'warning' | 'danger' | 'success'> = {
  UPCOMING: 'warning',
  DUE: 'danger',
  PAID: 'success',
};

const STATUS_ICON: Record<string, { name: string; color: string; bg: string }> = {
  UPCOMING: { name: 'clock-outline', color: colors.warning, bg: colors.warningBg },
  DUE: { name: 'alert-circle-outline', color: colors.danger, bg: colors.dangerBg },
  PAID: { name: 'check-circle-outline', color: colors.success, bg: colors.successBg },
};

function formatMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function formatAmount(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN')}`;
}

function FeeDueRowComponent({
  item,
  onPress,
  showStudentName = true,
  studentName,
}: FeeDueRowProps) {
  const statusInfo = STATUS_ICON[item.status] ?? STATUS_ICON['DUE'];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`fee-row-${item.id}`}
    >
      <View style={[styles.iconCircle, { backgroundColor: statusInfo?.bg ?? colors.dangerBg }]}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name={statusInfo?.name ?? 'alert-circle-outline'} size={20} color={statusInfo?.color ?? colors.danger} />
      </View>

      <View style={styles.info}>
        {showStudentName && studentName && (
          <Text style={styles.name} numberOfLines={1}>{studentName}</Text>
        )}
        <Text style={styles.month}>{formatMonthKey(item.monthKey)}</Text>
        {item.paidAt && (
          <Text style={styles.paidAt}>
            Paid on {new Date(item.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </Text>
        )}
      </View>

      <View style={styles.right}>
        <Text style={styles.amount}>{formatAmount(item.amount)}</Text>
        <Badge label={item.status} variant={STATUS_VARIANT[item.status] ?? 'neutral'} />
      </View>

      {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
      <Icon name="chevron-right" size={18} color={colors.textDisabled} style={styles.chevron} />
    </TouchableOpacity>
  );
}

export const FeeDueRow = memo(FeeDueRowComponent);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: 1,
  },
  month: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  paidAt: {
    fontSize: fontSizes.xs,
    color: colors.success,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginRight: spacing.xs,
  },
  amount: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  chevron: {
    marginLeft: spacing.xs,
  },
});
