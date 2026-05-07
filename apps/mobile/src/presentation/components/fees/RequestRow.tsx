import React, { memo, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, Platform } from 'react-native';
import { AvatarImage } from '../ui/AvatarImage';
import type { PaymentRequestItem } from '../../../domain/fees/payment-requests.types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AppCard } from '../ui/AppCard';
import { AppIcon } from '../ui/AppIcon';
import { spacing, fontSizes, fontWeights, radius, letterSpacing } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { formatTimeAgo, formatCurrency, formatMonthShort } from '../../utils/format';

type RequestRowProps = {
  item: PaymentRequestItem;
  onApprove?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onEdit?: () => void;
  /** Hide the "Requested by …" line. Use on the staff's own My Requests
   *  list — the author is always the viewer, so the line is just noise. */
  hideAuthor?: boolean;
};

const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

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

function RequestRowComponent({
  item,
  onApprove,
  onReject,
  onCancel,
  onEdit,
  hideAuthor = false,
}: RequestRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isPending = item.status === 'PENDING';
  const isApproved = item.status === 'APPROVED';
  const isRejected = item.status === 'REJECTED';
  const isParent = item.source === 'PARENT';
  const [proofOpen, setProofOpen] = useState(false);
  const closeProof = useCallback(() => setProofOpen(false), []);

  // Status colours — drive the left accent stripe + footer icon. Each card
  // gets a 3px coloured edge so a long list scans by status at a glance.
  const accentColor =
    item.status === 'PENDING'
      ? colors.warning
      : item.status === 'APPROVED'
        ? colors.success
        : item.status === 'REJECTED'
          ? colors.danger
          : colors.border;

  const showActions =
    isPending && (onApprove != null || onReject != null || onCancel != null || onEdit != null);
  const showFooterMeta = (isApproved || isRejected) && item.reviewedByName;

  return (
    <AppCard
      style={[styles.card, { borderLeftColor: accentColor, borderLeftWidth: 3 }]}
      testID={`request-row-${item.id}`}
    >
      {/* Header — month + relative time on the left, status pill on the right */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.month}>{formatMonthShort(item.monthKey)}</Text>
          <Text style={styles.headerSeparator}>·</Text>
          <Text style={styles.timeAgo}>{formatTimeAgo(item.createdAt)}</Text>
        </View>
        <View style={styles.badgeRow}>
          {isParent && <Badge label="Parent" variant="info" dot uppercase />}
          <Badge
            label={item.status}
            variant={STATUS_VARIANT[item.status] ?? 'neutral'}
            dot
            uppercase
          />
        </View>
      </View>

      {/* Identity block — student name is the visual anchor, then optional
          author and prominent amount. */}
      {item.studentName ? <Text style={styles.studentName}>{item.studentName}</Text> : null}

      {!hideAuthor && item.staffName ? (
        <Text style={styles.authorLine}>
          {isParent ? 'Submitted by ' : 'Requested by '}
          <Text style={styles.authorName}>{item.staffName}</Text>
        </Text>
      ) : null}

      <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>

      {/* Parent-only details — method + ref number chips */}
      {isParent ? (
        <View style={styles.parentDetails}>
          {item.paymentMethod ? (
            <View style={styles.methodChip}>
              <AppIcon
                name={methodIcon(item.paymentMethod)}
                size={13}
                color={colors.textSecondary}
              />
              <Text style={styles.methodText}>{methodLabel(item.paymentMethod)}</Text>
            </View>
          ) : null}
          {item.paymentRefNumber ? (
            <View style={styles.refChip}>
              <Text style={styles.refLabel}>REF</Text>
              <Text style={styles.refValue} numberOfLines={1}>
                {item.paymentRefNumber}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Notes — quote-style block with a vertical accent bar, italic body */}
      {item.staffNotes && item.staffNotes.length > 0 ? (
        <View style={styles.notesQuote}>
          <View style={styles.notesAccent} />
          <Text style={styles.notesText} numberOfLines={3}>
            {item.staffNotes}
          </Text>
        </View>
      ) : null}

      {/* Parent-only proof thumbnail */}
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

      {/* Footer metadata — only for terminal states. Divided from the body
          to make the timeline (submit → review → action) read clearly. */}
      {showFooterMeta ? (
        <>
          <View style={styles.divider} />
          <View style={styles.reviewRow}>
            <View
              style={[
                styles.reviewIcon,
                {
                  backgroundColor: isApproved ? colors.successBg : colors.dangerBg,
                  borderColor: isApproved ? colors.successBorder : colors.dangerBorder,
                },
              ]}
            >
              <AppIcon
                name={isApproved ? 'check-bold' : 'close-thick'}
                size={12}
                color={isApproved ? colors.successText : colors.dangerText}
              />
            </View>
            <Text style={styles.reviewText}>
              {isApproved ? 'Approved by ' : 'Rejected by '}
              <Text style={styles.reviewName}>{item.reviewedByName}</Text>
            </Text>
          </View>
          {isRejected && item.rejectionReason ? (
            <View style={styles.rejectionCallout}>
              <Text style={styles.rejectionLabel}>REASON</Text>
              <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
            </View>
          ) : null}
        </>
      ) : null}

      {/* Action bar — only for PENDING. Edit is the primary affordance,
          Cancel/Reject are secondary so the eye lands on the next step. */}
      {showActions ? (
        <>
          <View style={styles.divider} />
          <View style={styles.actions}>
            {onCancel ? (
              <View style={styles.actionButton}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  size="sm"
                  onPress={onCancel}
                  testID={`cancel-${item.id}`}
                />
              </View>
            ) : null}
            {onReject ? (
              <View style={styles.actionButton}>
                <Button
                  title="Reject"
                  variant="danger"
                  size="sm"
                  onPress={onReject}
                  testID={`reject-${item.id}`}
                />
              </View>
            ) : null}
            {onEdit ? (
              <View style={styles.actionButton}>
                <Button title="Edit" size="sm" onPress={onEdit} testID={`edit-${item.id}`} />
              </View>
            ) : null}
            {onApprove ? (
              <View style={styles.actionButton}>
                <Button
                  title="Approve"
                  size="sm"
                  onPress={onApprove}
                  testID={`approve-${item.id}`}
                />
              </View>
            ) : null}
          </View>
        </>
      ) : null}

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
      marginBottom: spacing.sm + 2,
    },

    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 1,
    },
    month: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      letterSpacing: 0.2,
    },
    headerSeparator: {
      fontSize: fontSizes.sm,
      color: colors.textDisabled,
    },
    timeAgo: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      fontWeight: fontWeights.medium,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flexWrap: 'wrap',
    },

    // Identity
    studentName: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      letterSpacing: -0.2,
      marginBottom: 2,
    },
    authorLine: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    authorName: {
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    amount: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.heavy,
      color: colors.text,
      letterSpacing: letterSpacing.tight,
      marginBottom: spacing.sm,
    },

    // Parent details
    parentDetails: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.sm,
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

    // Notes — quote block
    notesQuote: {
      flexDirection: 'row',
      backgroundColor: colors.bgSubtle,
      borderRadius: radius.md,
      padding: spacing.sm + 2,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.sm,
    },
    notesAccent: {
      width: 3,
      borderRadius: 1.5,
      backgroundColor: colors.primary,
      marginRight: spacing.sm + 2,
    },
    notesText: {
      flex: 1,
      fontSize: fontSizes.sm,
      color: colors.text,
      lineHeight: 18,
      fontStyle: 'italic',
    },

    // Proof thumbnail (parent-source rows)
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

    // Footer divider — separates body from review meta + actions
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.sm,
    },

    // Review row
    reviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    reviewIcon: {
      width: 22,
      height: 22,
      borderRadius: radius.full,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reviewText: {
      flex: 1,
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
    },
    reviewName: {
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },

    // Rejection callout — danger-tinted block highlighting the reason
    rejectionCallout: {
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      borderRadius: radius.md,
      padding: spacing.sm + 2,
      marginTop: spacing.xs,
    },
    rejectionLabel: {
      fontSize: 10,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.widest,
      color: colors.dangerText,
      marginBottom: 4,
    },
    rejectionText: {
      fontSize: fontSizes.sm,
      color: colors.text,
      lineHeight: 18,
    },

    // Action bar
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    actionButton: {
      flex: 1,
    },

    // Full-screen proof preview
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
