import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import LinearGradient from 'react-native-linear-gradient';
import { fontSizes, fontWeights, radius, shadows, spacing, gradient } from '../../theme';
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
  EVENT_CREATED: 'Event Created',
  EVENT_UPDATED: 'Event Updated',
  EVENT_DELETED: 'Event Deleted',
  EXPENSE_CREATED: 'Expense Created',
  EXPENSE_UPDATED: 'Expense Updated',
  EXPENSE_DELETED: 'Expense Deleted',
  ENQUIRY_CREATED: 'Enquiry Created',
  ENQUIRY_UPDATED: 'Enquiry Updated',
  ENQUIRY_CLOSED: 'Enquiry Closed',
  BATCH_CREATED: 'Batch Created',
  BATCH_UPDATED: 'Batch Updated',
  BATCH_DELETED: 'Batch Deleted',
  FEE_MARKED_PAID: 'Fee Marked Paid',
  GALLERY_PHOTO_UPLOADED: 'Photo Uploaded',
  GALLERY_PHOTO_DELETED: 'Photo Deleted',
  ADMIN_OWNER_PASSWORD_RESET: 'Password Reset',
  SUBSCRIPTION_PAYMENT_COMPLETED: 'Payment Completed',
  SUBSCRIPTION_PAYMENT_FAILED: 'Payment Failed',
  ACCOUNT_DELETION_REQUESTED: 'Deletion Requested',
  ACCOUNT_DELETION_CANCELLED: 'Deletion Cancelled',
  ACCOUNT_DELETION_EXECUTED: 'Account Deleted',
};

const ENTITY_LABELS: Record<string, string> = {
  STUDENT: 'Student',
  BATCH: 'Batch',
  STAFF: 'Staff',
  STAFF_ATTENDANCE: 'Staff Attendance',
  STUDENT_ATTENDANCE: 'Attendance',
  FEE: 'Fee',
  FEE_DUE: 'Fee',
  PAYMENT_REQUEST: 'Payment',
  EVENT: 'Event',
  EXPENSE: 'Expense',
  ENQUIRY: 'Enquiry',
  GALLERY_PHOTO: 'Photo',
  USER: 'User',
  SUBSCRIPTION: 'Subscription',
  SUBSCRIPTION_PAYMENT: 'Subscription',
  ACADEMY: 'Academy',
};

function getActionIcon(action: string): string {
  if (action.includes('CREATED') || action.includes('PLUS')) return 'plus-circle-outline';
  if (action.includes('UPDATED') || action.includes('EDITED') || action.includes('CHANGED')) return 'pencil-circle-outline';
  if (action.includes('DELETED') || action.includes('REMOVE')) return 'minus-circle-outline';
  if (action.includes('APPROVED') || action.includes('COMPLETED')) return 'check-circle-outline';
  if (action.includes('REJECTED') || action.includes('FAILED') || action.includes('CANCELLED')) return 'close-circle-outline';
  if (action.includes('ATTENDANCE')) return 'calendar-check-outline';
  if (action.includes('PAYMENT') || action.includes('FEE')) return 'cash';
  if (action.includes('PHOTO') || action.includes('GALLERY')) return 'image-outline';
  return 'file-document-outline';
}

function getActionColorKey(action: string): 'info' | 'success' | 'warning' | 'danger' | 'primary' {
  if (action.includes('DELETED') || action.includes('REJECTED') || action.includes('CANCELLED') || action.includes('FAILED')) return 'danger';
  if (action.includes('APPROVED') || action.includes('COMPLETED') || action.includes('PAID')) return 'success';
  if (action.includes('CREATED') || action.includes('UPLOADED')) return 'info';
  if (action.includes('UPDATED') || action.includes('CHANGED') || action.includes('EDITED')) return 'warning';
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

const MAX_CONTEXT_KEYS = 4;
const MAX_VALUE_LENGTH = 30;

/** Keys with raw IDs or technical data — hide from UI */
const HIDDEN_CONTEXT_KEYS = new Set([
  'staffUserId', 'studentId', 'userId', 'entityId', 'academyId',
  'feeDueId', 'requestId', 'orderId', 'parentId', 'batchId',
  'providerPaymentId', 'cfPaymentId',
]);

/** Check if a value looks like a UUID */
function isUuidLike(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(val) || /^[0-9a-f]{24}$/i.test(val);
}

/** Humanize context key names */
function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\s+/, '')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

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
    ? Object.entries(item.context)
        .filter(([key, val]) => !HIDDEN_CONTEXT_KEYS.has(key) && val && !isUuidLike(val) && !val.includes('[REDACTED'))
        .slice(0, MAX_CONTEXT_KEYS)
    : [];

  const colorKey = getActionColorKey(item.action);
  const isPrimary = colorKey === 'primary';
  const iconColor = isPrimary ? '#FFFFFF' : colors[colorKey];
  const iconBg = getActionBg(colorKey, colors);

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, isPrimary ? { overflow: 'hidden' } : { backgroundColor: iconBg }]}>
          {isPrimary && (
            <LinearGradient
              colors={[gradient.start, gradient.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <AppIcon name={getActionIcon(item.action)} size={18} color={iconColor} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.actionLabel} testID={testID ? `${testID}-action` : undefined} numberOfLines={1}>
            {ACTION_LABELS[item.action] ?? item.action.replace(/_/g, ' ')}
          </Text>
          <View style={styles.metaRow}>
            
            <AppIcon name="clock-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detailItem}>
          <AppIcon name="tag-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {ENTITY_LABELS[item.entityType] ?? item.entityType.replace(/_/g, ' ')}
          </Text>
        </View>
        {item.actorName ? (
          <View style={styles.detailItem}>
            <AppIcon name="account-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.detailText}>{item.actorName}</Text>
          </View>
        ) : null}
      </View>

      {contextEntries.length > 0 && (
        <View style={styles.contextRow}>
          {contextEntries.map(([key, val]) => (
            <View key={key} style={styles.chip}>
              <Text style={styles.chipKey}>{humanizeKey(key)}</Text>
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
