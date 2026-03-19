import React, { useMemo } from 'react';
import { View, Text, Modal, Keyboard, StyleSheet } from 'react-native';

import { spacing, fontSizes, fontWeights, radius } from '../../theme';
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
    <Modal visible={visible} transparent animationType="fade" onShow={Keyboard.dismiss} onRequestClose={onCancel} testID={testID}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <View style={styles.button}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={onCancel}
                disabled={loading}
                testID="confirm-cancel"
              />
            </View>
            <View style={styles.button}>
              <Button
                title={confirmLabel}
                variant={confirmVariant}
                onPress={onConfirm}
                loading={loading}
                testID="confirm-ok"
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
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
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
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
  },
});
