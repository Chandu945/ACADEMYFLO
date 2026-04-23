import React, { useMemo } from 'react';
import { View, Text, Modal, Keyboard, StyleSheet, Pressable } from 'react-native';

import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { Button } from './Button';
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
  testID,
}: ConfirmSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          <Text style={styles.message}>{message}</Text>
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
    padding: spacing.xl,
    ...shadows.sm,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
  },
});
