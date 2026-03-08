import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { PaymentRequestItem } from '../../../domain/fees/payment-requests.types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AppCard } from '../ui/AppCard';
import { colors, spacing, fontSizes, fontWeights } from '../../theme';

type RequestRowProps = {
  item: PaymentRequestItem;
  onApprove?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onEdit?: () => void;
};

const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

function RequestRowComponent({ item, onApprove, onReject, onCancel, onEdit }: RequestRowProps) {
  const isPending = item.status === 'PENDING';

  return (
    <AppCard style={styles.card} testID={`request-row-${item.id}`}>
      <View style={styles.header}>
        <Text style={styles.month}>{item.monthKey}</Text>
        <Badge label={item.status} variant={STATUS_VARIANT[item.status] ?? 'neutral'} />
      </View>

      {item.studentName && (
        <Text style={styles.studentName}>{item.studentName}</Text>
      )}
      {item.staffName && (
        <Text style={styles.staffName}>Requested by: {item.staffName}</Text>
      )}
      <Text style={styles.amount}>{`\u20B9${item.amount}`}</Text>
      <Text style={styles.notes} numberOfLines={2}>
        {item.staffNotes}
      </Text>

      {item.reviewedByName && (
        <Text style={styles.reviewedBy}>
          {item.status === 'APPROVED' ? 'Approved' : 'Reviewed'} by: {item.reviewedByName}
        </Text>
      )}
      {item.rejectionReason && <Text style={styles.rejection}>Reason: {item.rejectionReason}</Text>}

      {isPending && (onApprove || onReject || onCancel || onEdit) && (
        <View style={styles.actions}>
          {onEdit && (
            <View style={styles.actionButton}>
              <Button
                title="Edit"
                variant="secondary"
                onPress={onEdit}
                testID={`edit-${item.id}`}
              />
            </View>
          )}
          {onApprove && (
            <View style={styles.actionButton}>
              <Button title="Approve" onPress={onApprove} testID={`approve-${item.id}`} />
            </View>
          )}
          {onReject && (
            <View style={styles.actionButton}>
              <Button
                title="Reject"
                variant="danger"
                onPress={onReject}
                testID={`reject-${item.id}`}
              />
            </View>
          )}
          {onCancel && (
            <View style={styles.actionButton}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={onCancel}
                testID={`cancel-${item.id}`}
              />
            </View>
          )}
        </View>
      )}
    </AppCard>
  );
}

export const RequestRow = memo(RequestRowComponent);

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  month: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  studentName: {
    fontSize: fontSizes.base,
    color: colors.text,
    fontWeight: fontWeights.semibold,
    marginBottom: 2,
  },
  staffName: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: fontWeights.medium,
    marginBottom: 2,
  },
  reviewedBy: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
    marginBottom: spacing.xs,
  },
  amount: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textMedium,
    marginBottom: spacing.xs,
  },
  notes: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  rejection: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
