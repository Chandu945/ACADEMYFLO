import React, { useMemo } from 'react';
import { View, Text, Modal, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Button } from '../ui/Button';
import { AppIcon } from '../ui/AppIcon';
import { useTheme } from '../../context/ThemeContext';
import { spacing, fontSizes, fontWeights, radius, shadows, letterSpacing } from '../../theme';
import type { Colors } from '../../theme';
import type { PaymentRequestItem } from '../../../domain/fees/payment-requests.types';
import {
  formatCurrency,
  formatMonthKey,
  formatTimeAgo,
} from '../../utils/format';

type PendingRequestSheetProps = {
  visible: boolean;
  request: PaymentRequestItem | null;
  /** Optional fee-due breakdown. When the screen knows the underlying
   * `FeeDueItem` (and there's a late fee), passing these splits the total
   * into base + late so the staff can see why the amount is what it is.
   * Otherwise the sheet shows just a single Total row. */
  baseAmount?: number;
  lateFee?: number;
  /** Whether the current user authored this request. Drives the action
   *  buttons — only the author can edit notes or cancel; for other
   *  authors (another staff or the parent) the sheet is read-only. */
  mine?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onCancelRequest: () => void;
  cancelling?: boolean;
};

export function PendingRequestSheet({
  visible,
  request,
  baseAmount,
  lateFee = 0,
  mine = true,
  onClose,
  onEdit,
  onCancelRequest,
  cancelling,
}: PendingRequestSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!request) return null;

  const showBreakdown = typeof baseAmount === 'number' && lateFee > 0;
  const submittedAgo = formatTimeAgo(request.createdAt);
  const isParent = request.source === 'PARENT';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={cancelling ? undefined : onClose}
      statusBarTranslucent
    >
      <View
        style={styles.overlay}
        accessible
        accessibilityRole="alert"
        accessibilityLabel="Pending payment request"
        accessibilityViewIsModal
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={cancelling ? undefined : onClose}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />

        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <AppIcon name="clock-outline" size={22} color={colors.warningText} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Payment Request</Text>
                <Text style={styles.headerMonth}>{formatMonthKey(request.monthKey)}</Text>
              </View>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusPillText}>PENDING</Text>
              </View>
            </View>

            {/* Amount card */}
            <View style={styles.amountCard}>
              {showBreakdown ? (
                <>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Base fee</Text>
                    <Text style={styles.rowValue}>{formatCurrency(baseAmount as number)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Late fee</Text>
                    <Text style={[styles.rowValue, styles.lateFeeValue]}>
                      +{formatCurrency(lateFee)}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                </>
              ) : null}
              <View style={[styles.row, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(request.amount)}</Text>
              </View>
            </View>

            {/* Submitted by */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>SUBMITTED BY</Text>
              <View style={styles.submittedRow}>
                <View
                  style={[
                    styles.avatarCircle,
                    isParent
                      ? { backgroundColor: colors.infoBg, borderColor: colors.info }
                      : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarInitial,
                      isParent ? { color: colors.infoText } : null,
                    ]}
                  >
                    {(request.staffName ?? '?').trim().charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.submittedInfo}>
                  <View style={styles.submittedNameRow}>
                    <Text style={styles.submittedName} numberOfLines={1}>
                      {mine ? 'You' : request.staffName ?? 'Unknown'}
                    </Text>
                    <View
                      style={[
                        styles.sourceBadge,
                        isParent
                          ? { backgroundColor: colors.infoBg, borderColor: colors.info }
                          : { backgroundColor: colors.primarySoft, borderColor: colors.primaryLight },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sourceBadgeText,
                          { color: isParent ? colors.infoText : colors.primary },
                        ]}
                      >
                        {isParent ? 'PARENT' : 'STAFF'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.submittedTime}>{submittedAgo}</Text>
                </View>
              </View>
            </View>

            {/* Notes */}
            {request.staffNotes ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>COLLECTION NOTES</Text>
                <View style={styles.notesQuote}>
                  <View style={styles.notesAccent} />
                  <Text style={styles.notesText}>{request.staffNotes}</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Actions — stacked so labels never wrap. Read-only for non-mine
              requests since only the author can edit / cancel. */}
          <View style={styles.actions}>
            {mine ? (
              <>
                <Button
                  title="Edit notes"
                  variant="primary"
                  onPress={onEdit}
                  disabled={cancelling}
                  testID="pending-sheet-edit"
                />
                <View style={styles.actionGap} />
                <Button
                  title="Cancel request"
                  variant="danger"
                  onPress={onCancelRequest}
                  disabled={cancelling}
                  testID="pending-sheet-cancel-request"
                />
              </>
            ) : (
              <View style={styles.readOnlyHint}>
                <Text style={styles.readOnlyHintText}>
                  Only the {isParent ? 'parent' : 'staff member'} who submitted this request can
                  edit or cancel it. Wait for the owner to approve or reject.
                </Text>
              </View>
            )}

            <Pressable
              style={styles.closeLink}
              onPress={cancelling ? undefined : onClose}
              disabled={cancelling}
              testID="pending-sheet-close"
              hitSlop={8}
            >
              <Text style={styles.closeLinkText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
      maxHeight: '88%',
      ...shadows.lg,
    },
    dragHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderStrong,
      alignSelf: 'center',
      marginBottom: spacing.base,
      opacity: 0.6,
    },
    content: {
      paddingBottom: spacing.base,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: colors.warningBg,
      borderWidth: 1,
      borderColor: colors.warningBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    headerTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      letterSpacing: -0.2,
    },
    headerMonth: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.warningBg,
      borderWidth: 1,
      borderColor: colors.warningBorder,
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.warning,
    },
    statusPillText: {
      fontSize: 10,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.widest,
      color: colors.warningText,
    },

    // Amount card
    amountCard: {
      backgroundColor: colors.bgSubtle,
      borderRadius: radius.lg,
      padding: spacing.base,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.lg,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    rowLabel: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
    },
    rowValue: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    lateFeeValue: {
      color: colors.warningText,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 6,
    },
    totalRow: {
      paddingVertical: 4,
    },
    totalLabel: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    totalValue: {
      fontSize: fontSizes['2xl'],
      fontWeight: fontWeights.heavy,
      color: colors.text,
      letterSpacing: letterSpacing.tight,
    },

    // Generic section block
    section: {
      marginBottom: spacing.lg,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.widest,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },

    // Submitted by row
    submittedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm + 2,
    },
    avatarCircle: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.bold,
      color: colors.primary,
    },
    submittedInfo: {
      flex: 1,
      minWidth: 0,
    },
    submittedNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs + 2,
      flexWrap: 'wrap',
    },
    submittedName: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    sourceBadge: {
      borderWidth: 1,
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    sourceBadgeText: {
      fontSize: 9,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.widest,
    },
    submittedTime: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginTop: 1,
    },

    // Notes — quote style
    notesQuote: {
      flexDirection: 'row',
      backgroundColor: colors.bgSubtle,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    notesAccent: {
      width: 3,
      borderRadius: 1.5,
      backgroundColor: colors.primary,
      marginRight: spacing.md,
    },
    notesText: {
      flex: 1,
      fontSize: fontSizes.sm,
      color: colors.text,
      lineHeight: 20,
      fontStyle: 'italic',
    },

    // Actions
    actions: {
      paddingTop: spacing.base,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: spacing.xs,
    },
    actionGap: {
      height: spacing.sm + 2,
    },
    readOnlyHint: {
      backgroundColor: colors.disabledBg,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    readOnlyHintText: {
      fontSize: fontSizes.sm,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    closeLink: {
      alignSelf: 'center',
      paddingVertical: spacing.md,
      marginTop: spacing.xs,
    },
    closeLinkText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: colors.textSecondary,
    },
  });
