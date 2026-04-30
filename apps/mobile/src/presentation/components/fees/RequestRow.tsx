import React, { memo, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, Platform } from 'react-native';
import { AvatarImage } from '../ui/AvatarImage';
import type { PaymentRequestItem } from '../../../domain/fees/payment-requests.types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AppCard } from '../ui/AppCard';
import { AppIcon } from '../ui/AppIcon';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

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

function monthIconLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function methodIcon(method: PaymentRequestItem['paymentMethod']): string {
  switch (method) {
    case 'UPI':
      return 'qrcode';
    case 'BANK':
      return 'bank-outline';
    case 'CASH':
      return 'cash';
    case 'OTHER':
    default:
      return 'swap-horizontal';
  }
}

function methodLabel(method: PaymentRequestItem['paymentMethod']): string {
  switch (method) {
    case 'UPI':
      return 'UPI';
    case 'BANK':
      return 'Bank transfer';
    case 'CASH':
      return 'Cash';
    case 'OTHER':
    default:
      return 'Other';
  }
}

function RequestRowComponent({ item, onApprove, onReject, onCancel, onEdit }: RequestRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isPending = item.status === 'PENDING';
  const isParent = item.source === 'PARENT';
  const [proofOpen, setProofOpen] = useState(false);

  const closeProof = useCallback(() => setProofOpen(false), []);

  return (
    <AppCard style={styles.card} testID={`request-row-${item.id}`}>
      <View style={styles.header}>
        <Text style={styles.month}>{monthIconLabel(item.monthKey)}</Text>
        <View style={styles.badgeRow}>
          {isParent && <Badge label="Parent" variant="info" dot uppercase />}
          <Badge label={item.status} variant={STATUS_VARIANT[item.status] ?? 'neutral'} dot uppercase />
        </View>
      </View>

      {item.studentName && (
        <Text style={styles.studentName}>{item.studentName}</Text>
      )}
      {item.staffName && (
        <Text style={styles.staffName}>
          {isParent ? 'Submitted by: ' : 'Requested by: '}
          {item.staffName}
        </Text>
      )}
      <Text style={styles.amount}>{`\u20B9${item.amount.toLocaleString('en-IN')}`}</Text>

      {/* Parent-only details — method, ref number, proof thumbnail */}
      {isParent && (
        <View style={styles.parentDetails}>
          {item.paymentMethod && (
            <View style={styles.methodChip}>
              <AppIcon name={methodIcon(item.paymentMethod)} size={13} color={colors.textSecondary} />
              <Text style={styles.methodText}>{methodLabel(item.paymentMethod)}</Text>
            </View>
          )}
          {item.paymentRefNumber ? (
            <View style={styles.refChip}>
              <Text style={styles.refLabel}>REF</Text>
              <Text style={styles.refValue} numberOfLines={1}>
                {item.paymentRefNumber}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {item.staffNotes?.length > 0 && (
        <Text style={styles.notes} numberOfLines={3}>
          {item.staffNotes}
        </Text>
      )}

      {isParent && item.proofImageUrl ? (
        <TouchableOpacity
          style={styles.proofRow}
          onPress={() => setProofOpen(true)}
          testID={`proof-thumb-${item.id}`}
        >
          <AvatarImage url={item.proofImageUrl} style={styles.proofThumb} resizeMode="cover" />
          <View style={styles.proofMeta}>
            <Text style={styles.proofLabel}>Payment proof</Text>
            <Text style={styles.proofHint}>Tap to view full size</Text>
          </View>
          <AppIcon name="magnify-expand" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}

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
                size="sm"
                onPress={onEdit}
                testID={`edit-${item.id}`}
              />
            </View>
          )}
          {onApprove && (
            <View style={styles.actionButton}>
              <Button title="Approve" size="sm" onPress={onApprove} testID={`approve-${item.id}`} />
            </View>
          )}
          {onReject && (
            <View style={styles.actionButton}>
              <Button
                title="Reject"
                variant="danger"
                size="sm"
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
                size="sm"
                onPress={onCancel}
                testID={`cancel-${item.id}`}
              />
            </View>
          )}
        </View>
      )}

      {/* Full-screen proof preview */}
      {isParent && item.proofImageUrl ? (
        <Modal visible={proofOpen} transparent animationType="fade" onRequestClose={closeProof}>
          <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={closeProof}>
            <Image
              source={{ uri: item.proofImageUrl }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.previewCloseBtn}
              onPress={closeProof}
              testID={`proof-close-${item.id}`}
            >
              <AppIcon name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      ) : null}
    </AppCard>
  );
}

export const RequestRow = memo(RequestRowComponent);

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      marginBottom: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
      gap: spacing.sm,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flexWrap: 'wrap',
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
      color: colors.text,
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
      color: colors.text,
      marginBottom: spacing.xs,
    },
    parentDetails: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    methodChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: colors.bgSubtle,
      borderWidth: 1,
      borderColor: colors.border,
    },
    methodText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      letterSpacing: 0.2,
    },
    refChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: colors.bgSubtle,
      borderWidth: 1,
      borderColor: colors.border,
      maxWidth: 200,
    },
    refLabel: {
      fontSize: 10,
      fontWeight: fontWeights.bold,
      color: colors.textDisabled,
      letterSpacing: 0.5,
    },
    refValue: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
      flexShrink: 1,
    },
    notes: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      lineHeight: 18,
    },
    proofRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.bgSubtle,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    proofThumb: {
      width: 56,
      height: 56,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    proofMeta: { flex: 1 },
    proofLabel: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    proofHint: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      marginTop: 2,
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

    /* Full-screen proof preview */
    previewOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    previewCloseBtn: {
      position: 'absolute',
      top: 48,
      right: spacing.base,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
