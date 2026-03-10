import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import type { AcademySettings, UpdateAcademySettingsRequest } from '../../../domain/settings/academy-settings.types';
import type { AppError } from '../../../domain/common/errors';
import { Button } from '../ui/Button';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type SettingsFormProps = {
  settings: AcademySettings;
  editable: boolean;
  saving: boolean;
  error: AppError | null;
  onSave: (req: UpdateAcademySettingsRequest) => Promise<AppError | null>;
};

export function SettingsForm({ settings, editable, saving, error, onSave }: SettingsFormProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [receiptPrefix, setReceiptPrefix] = useState(settings.receiptPrefix);
  const [dueDateDay, setDueDateDay] = useState(String(settings.defaultDueDateDay));

  const isDirty =
    receiptPrefix !== settings.receiptPrefix ||
    dueDateDay !== String(settings.defaultDueDateDay);

  const dayNum = parseInt(dueDateDay, 10);
  const dayValid = !isNaN(dayNum) && dayNum >= 1 && dayNum <= 28;
  const prefixValid = receiptPrefix.length > 0 && receiptPrefix.length <= 20;
  const canSave = editable && isDirty && dayValid && prefixValid && !saving;

  const handleSave = useCallback(async () => {
    const req: UpdateAcademySettingsRequest = {};
    if (receiptPrefix !== settings.receiptPrefix) {
      req.receiptPrefix = receiptPrefix;
    }
    if (dueDateDay !== String(settings.defaultDueDateDay)) {
      req.defaultDueDateDay = parseInt(dueDateDay, 10);
    }

    const saveError = await onSave(req);
    if (!saveError) {
      Alert.alert('Saved', 'Settings updated successfully.');
    }
  }, [receiptPrefix, dueDateDay, settings, onSave]);

  return (
    <View testID="settings-form">
      <Text style={styles.label}>Receipt Prefix</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={receiptPrefix}
        onChangeText={setReceiptPrefix}
        editable={editable}
        maxLength={20}
        placeholder="e.g. PC"
        testID="input-receipt-prefix"
      />
      {editable && !prefixValid && receiptPrefix.length === 0 && (
        <Text style={styles.hint} testID="prefix-error">
          Required
        </Text>
      )}

      <Text style={styles.label}>Default Due Date Day (1–28)</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={dueDateDay}
        onChangeText={setDueDateDay}
        editable={editable}
        keyboardType="number-pad"
        maxLength={2}
        placeholder="e.g. 5"
        testID="input-due-date-day"
      />
      {editable && !dayValid && dueDateDay.length > 0 && (
        <Text style={styles.hint} testID="day-error">
          Must be 1–28
        </Text>
      )}

      {error && (
        <Text style={styles.errorText} testID="settings-save-error">
          {error.message}
        </Text>
      )}

      {editable && (
        <View style={styles.buttonRow}>
          <Button
            title="Save"
            onPress={handleSave}
            disabled={!canSave}
            loading={saving}
            testID="settings-save-btn"
          />
        </View>
      )}

      {!editable && (
        <Text style={styles.readOnlyNote} testID="read-only-note">
          Only the academy owner can edit settings.
        </Text>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  label: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.textMedium,
    marginBottom: 6,
    marginTop: spacing.base,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  inputDisabled: {
    backgroundColor: colors.bgSubtle,
    color: colors.textSecondary,
  },
  hint: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: fontSizes.base,
    color: colors.danger,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  buttonRow: {
    marginTop: spacing.xl,
  },
  readOnlyNote: {
    fontSize: fontSizes.sm,
    color: colors.textDisabled,
    marginTop: spacing.lg,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
