import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fontSizes, fontWeights, radius, shadows, spacing } from '../../theme';
import type { Colors } from '../../theme';
import type { AuditLogItem } from '../../../domain/audit/audit.types';
import { useTheme } from '../../context/ThemeContext';

const ACTION_LABELS: Record<string, string> = {
  STUDENT_CREATED: 'Student Created',
  STUDENT_UPDATED: 'Student Updated',
  STUDENT_STATUS_CHANGED: 'Status Changed',
  STUDENT_DELETED: 'Student Deleted',
  STUDENT_ATTENDANCE_EDITED: 'Attendance Edited',
  PAYMENT_REQUEST_CREATED: 'Payment Created',
  PAYMENT_REQUEST_CANCELLED: 'Payment Cancelled',
  PAYMENT_REQUEST_APPROVED: 'Payment Approved',
  PAYMENT_REQUEST_REJECTED: 'Payment Rejected',
  STAFF_ATTENDANCE_CHANGED: 'Staff Attendance',
  MONTHLY_DUES_ENGINE_RAN: 'Dues Engine Ran',
};

function getActionIcon(action: string): string {
  switch (action) {
    case 'STUDENT_CREATED': return 'account-plus-outline';
    case 'STUDENT_UPDATED': return 'account-edit-outline';
    case 'STUDENT_STATUS_CHANGED': return 'account-switch-outline';
    case 'STUDENT_DELETED': return 'account-remove-outline';
    case 'STUDENT_ATTENDANCE_EDITED': return 'calendar-edit';
    case 'PAYMENT_REQUEST_CREATED': return 'cash-plus';
    case 'PAYMENT_REQUEST_CANCELLED': return 'cash-remove';
    case 'PAYMENT_REQUEST_APPROVED': return 'cash-check';
    case 'PAYMENT_REQUEST_REJECTED': return 'close-circle-outline';
    case 'STAFF_ATTENDANCE_CHANGED': return 'clipboard-account-outline';
    case 'MONTHLY_DUES_ENGINE_RAN': return 'cog-outline';
    default: return 'file-document-outline';
  }
}

function getActionColorKey(action: string): 'info' | 'success' | 'warning' | 'danger' | 'primary' {
  if (action === 'STUDENT_DELETED' || action === 'PAYMENT_REQUEST_REJECTED' || action === 'PAYMENT_REQUEST_CANCELLED') return 'danger';
  if (action.startsWith('STUDENT_')) return 'info';
  if (action === 'PAYMENT_REQUEST_APPROVED') return 'success';
  if (action.startsWith('PAYMENT_')) return 'primary';
  if (action.startsWith('STAFF_')) return 'warning';
  return 'primary';
}

function getActionBg(colorKey: string, colors: Colors): string {
  switch (colorKey) {
    case 'info': return colors.infoBg;
    case 'success': return colors.successBg;
    case 'warning': return colors.warningBg;
    case 'danger': return colors.dangerBg;
    default: return colors.primarySoft;
  }
}

const MAX_CONTEXT_KEYS = 6;
const MAX_VALUE_LENGTH = 40;

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function truncate(val: string, max: number): string {
  return val.length > max ? val.slice(0, max) + '...' : val;
}

type AuditLogRowProps = {
  item: AuditLogItem;
  testID?: string;
};

function AuditLogRowComponent({ item, testID }: AuditLogRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const contextEntries = item.context
    ? Object.entries(item.context).slice(0, MAX_CONTEXT_KEYS)
    : [];

  const colorKey = getActionColorKey(item.action);
  const iconColor = colors[colorKey];
  const iconBg = getActionBg(colorKey, colors);

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
          <Icon name={getActionIcon(item.action)} size={18} color={iconColor} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.actionLabel} testID={testID ? `${testID}-action` : undefined} numberOfLines={1}>
            {ACTION_LABELS[item.action] ?? item.action.replace(/_/g, ' ')}
          </Text>
          <View style={styles.metaRow}>
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="clock-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detailItem}>
          {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
          <Icon name="shape-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {item.entityType}{item.entityId ? ` #${item.entityId.slice(0, 8)}` : ''}
          </Text>
        </View>
        <View style={styles.detailItem}>
          {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
          <Icon name="account-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.detailText}>{item.actorName ?? item.actorUserId.slice(0, 8)}</Text>
        </View>
      </View>

      {contextEntries.length > 0 && (
        <View style={styles.contextRow}>
          {contextEntries.map(([key, val]) => (
            <View key={key} style={styles.chip}>
              <Text style={styles.chipKey}>{key}</Text>
              <Text style={styles.chipVal}>{truncate(val, MAX_VALUE_LENGTH)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export const AuditLogRow = memo(AuditLogRowComponent);

const makeStyles = (colors: Colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  actionLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  contextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    gap: 4,
  },
  chipKey: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  chipVal: {
    fontSize: fontSizes.xs,
    color: colors.text,
  },
});
