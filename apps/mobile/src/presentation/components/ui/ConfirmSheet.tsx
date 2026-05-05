import React, { useMemo } from 'react';
import { View, Text, Modal, Keyboard, StyleSheet, Pressable } from 'react-native';

import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { Button } from './Button';
import { AppIcon } from './AppIcon';
import { useTheme } from '../../context/ThemeContext';

type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  /**
   * Whether the confirm button is disabled. Used by callers that need extra
   * input (e.g. a rejection reason) to gate confirmation until valid.
   */
  confirmDisabled?: boolean;
  /**
   * Optional icon shown in a tinted circle above the title. The tint follows
   * `iconVariant` so danger actions read at-a-glance without forcing the
   * caller to know the colour tokens.
   */
  icon?: string;
  iconVariant?: 'primary' | 'danger' | 'warning';
  /**
   * Slot rendered between message and action buttons. Used to put a textarea
   * or supporting context inside the same modal that gates confirmation —
   * keeps everything the user needs in one focused dialog.
   */
  children?: React.ReactNode;
  testID?: string;
};

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  loading,
  confirmDisabled,
  icon,
  iconVariant = 'primary',
  children,
  testID,
}: ConfirmSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const iconTint =
    iconVariant === 'danger'
      ? { bg: colors.dangerBg, fg: colors.danger }
      : iconVariant === 'warning'
        ? { bg: colors.warningLightBg, fg: colors.warningText }
        : { bg: colors.primarySoft, fg: colors.primary };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onShow={Keyboard.dismiss}
      onRequestClose={onCancel}
      statusBarTranslucent
      testID={testID}
    >
      <View
        style={styles.overlay}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={`${title}. ${message}`}
        accessibilityViewIsModal
      >
        {/* Tap outside to dismiss — backdrop is a sibling press target so
            taps on the dialog itself don't bubble to it. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={loading ? undefined : onCancel}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <View style={styles.dialog}>
          <View style={styles.header}>
            {icon ? (
              <View style={[styles.iconCircle, { backgroundColor: iconTint.bg }]}>
                <AppIcon name={icon} size={20} color={iconTint.fg} />
              </View>
            ) : null}
            <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>{title}</Text>
          </View>
          <Text style={styles.message}>{message}</Text>
          {children ? (
            <>
              <View style={styles.divider} />
              <View style={styles.childrenSlot}>{children}</View>
            </>
          ) : null}
          <View style={styles.actions}>
            <View style={styles.button}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={onCancel}
                disabled={loading}
                testID="confirm-cancel"
                accessibilityLabel={`Cancel ${title}`}
              />
            </View>
            <View style={styles.button}>
              <Button
                title={confirmLabel}
                variant={confirmVariant}
                onPress={onConfirm}
                loading={loading}
                disabled={confirmDisabled}
                testID="confirm-ok"
                accessibilityLabel={`${confirmLabel}: ${title}`}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  message: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  childrenSlot: {
    marginBottom: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  button: {
    flex: 1,
  },
});
