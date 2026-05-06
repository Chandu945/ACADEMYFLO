import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import { InitialsAvatar } from '../ui/InitialsAvatar';
import type { FeeDueItem } from '../../../domain/fees/fees.types';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency as formatAmount } from '../../utils/format';

type FeeDueRowProps = {
  item: FeeDueItem;
  onPress: () => void;
  showStudentName?: boolean;
  studentName?: string;
  /** When false, omit the month prefix from the subtitle. Use when the screen
   * already states the month (e.g., a single-month list). Default true. */
  showMonth?: boolean;
};

function getStatusTone(
  colors: Colors,
): Record<string, { dot: string; bg: string; border: string; icon: string; fg: string }> {
  return {
    UPCOMING: {
      dot: colors.warning,
      bg: colors.warningBg,
      border: colors.warningBorder,
      icon: 'clock-outline',
      fg: colors.warningText,
    },
    DUE: {
      dot: colors.danger,
      bg: colors.dangerBg,
      border: colors.dangerBorder,
      icon: 'alert-circle-outline',
      fg: colors.dangerText,
    },
    PAID: {
      dot: colors.success,
      bg: colors.successBg,
      border: colors.successBorder,
      icon: 'check-circle-outline',
      fg: colors.successText,
    },
  };
}

function formatMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function daysBetween(iso: string): number {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - d.getTime()) / 86_400_000);
}

function subtitleFor(item: FeeDueItem, showMonth: boolean): string {
  const month = formatMonthKey(item.monthKey);
  const prefix = showMonth ? `${month} · ` : '';
  if (item.status === 'PAID' && item.paidAt) {
    const paid = new Date(item.paidAt);
    if (!isNaN(paid.getTime())) {
      return `${prefix}Paid ${paid.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
    }
    return showMonth ? month : 'Paid';
  }
  if (item.status === 'DUE') {
    const days = daysBetween(item.dueDate);
    if (days > 0) return `${prefix}${days} ${days === 1 ? 'day' : 'days'} overdue`;
    return showMonth ? month : 'Due today';
  }
  if (item.status === 'UPCOMING') {
    const days = -daysBetween(item.dueDate);
    if (days > 0) return `${prefix}Due in ${days} ${days === 1 ? 'day' : 'days'}`;
    return showMonth ? month : 'Upcoming';
  }
  return showMonth ? month : '';
}

function FeeDueRowComponent({
  item,
  onPress,
  showStudentName = true,
  studentName,
  showMonth = true,
}: FeeDueRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const TONES = useMemo(() => getStatusTone(colors), [colors]);
  const tone = TONES[item.status] ?? TONES['DUE']!;
  const resolvedName = studentName || item.studentName;
  const hasName = showStudentName && resolvedName;

  const payable = item.status !== 'PAID' && item.lateFee > 0 ? item.totalPayable : item.amount;
  const subtitle = subtitleFor(item, showMonth);

  const stripeColor =
    item.status === 'DUE'
      ? colors.danger
      : item.status === 'UPCOMING'
        ? colors.warning
        : item.status === 'PAID'
          ? colors.success
          : colors.border;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: stripeColor }]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`fee-row-${item.id}`}
    >
      {hasName ? (
        <InitialsAvatar
          name={resolvedName!}
          size={38}
          variant="palette"
          style={styles.avatarSpacing}
        />
      ) : (
        <View
          style={[styles.iconCircle, { backgroundColor: tone.bg, borderColor: tone.border }]}
        >
          <AppIcon name={tone.icon} size={18} color={tone.fg} />
        </View>
      )}

      <View style={styles.info}>
        {hasName && (
          <Text style={styles.name} numberOfLines={1}>
            {resolvedName}
          </Text>
        )}
        <View style={styles.subtitleRow}>
          <View style={[styles.subtitleDot, { backgroundColor: tone.dot }]} />
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {item.status !== 'PAID' && item.lateFee > 0 && (
          <Text style={styles.lateFeeText}>+{formatAmount(item.lateFee)} late fee</Text>
        )}
      </View>

      <View style={styles.right}>
        <Text
          style={styles.amount}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {formatAmount(payable)}
        </Text>
      </View>

      <AppIcon name="chevron-right" size={18} color={colors.textDisabled} style={styles.chevron} />
    </TouchableOpacity>
  );
}

export const FeeDueRow = memo(FeeDueRowComponent);

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm + 2,
      paddingRight: spacing.md,
      paddingLeft: spacing.md,
      marginBottom: spacing.xs + 2,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 3,
    },
    avatarSpacing: {
      marginRight: spacing.md,
    },
    iconCircle: {
      width: 38,
      height: 38,
      borderRadius: radius.full,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    info: {
      flex: 1,
      minWidth: 0,
      marginRight: spacing.sm,
    },
    name: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      letterSpacing: -0.2,
      marginBottom: 3,
    },
    subtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    subtitleDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    subtitle: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      letterSpacing: 0.1,
      fontWeight: fontWeights.medium,
      flexShrink: 1,
    },
    lateFeeText: {
      marginTop: 2,
      fontSize: 10,
      fontWeight: fontWeights.medium,
      color: colors.dangerText,
    },
    right: {
      alignItems: 'flex-end',
      minWidth: 84,
      maxWidth: 140,
    },
    amount: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      letterSpacing: -0.1,
    },
    chevron: {
      marginLeft: spacing.xs,
    },
  });
