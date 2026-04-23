import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { AcademySettings, UpdateAcademySettingsRequest } from '../../../domain/settings/academy-settings.types';
import type { AppError } from '../../../domain/common/errors';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { GradientSwitch } from '../ui/GradientSwitch';
import { AppIcon } from '../ui/AppIcon';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';

type SettingsFormProps = {
  settings: AcademySettings;
  editable: boolean;
  saving: boolean;
  error: AppError | null;
  onSave: (req: UpdateAcademySettingsRequest) => Promise<AppError | null>;
};

const REPEAT_INTERVALS = [1, 3, 5] as const;

export function SettingsForm({ settings, editable, saving, error, onSave }: SettingsFormProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { showToast } = useToast();
  const [receiptPrefix, setReceiptPrefix] = useState(settings.receiptPrefix);
  const [dueDateDay, setDueDateDay] = useState(String(settings.defaultDueDateDay));
  const [lateFeeEnabled, setLateFeeEnabled] = useState(settings.lateFeeEnabled);
  const [gracePeriodDays, setGracePeriodDays] = useState(String(settings.gracePeriodDays));
  const [lateFeeAmount, setLateFeeAmount] = useState(String(settings.lateFeeAmountInr));
  const [repeatInterval, setRepeatInterval] = useState(settings.lateFeeRepeatIntervalDays);

  const isDirty =
    receiptPrefix !== settings.receiptPrefix ||
    dueDateDay !== String(settings.defaultDueDateDay) ||
    lateFeeEnabled !== settings.lateFeeEnabled ||
    gracePeriodDays !== String(settings.gracePeriodDays) ||
    lateFeeAmount !== String(settings.lateFeeAmountInr) ||
    repeatInterval !== settings.lateFeeRepeatIntervalDays;

  useUnsavedChangesWarning(isDirty && !saving);

  const dayNum = parseInt(dueDateDay, 10);
  const dayValid = !isNaN(dayNum) && dayNum >= 1 && dayNum <= 28;
  const prefixValid = receiptPrefix.length > 0 && receiptPrefix.length <= 20;
  const graceNum = parseInt(gracePeriodDays, 10);
  const graceValid = !isNaN(graceNum) && graceNum >= 0 && graceNum <= 30;
  const feeAmtNum = parseInt(lateFeeAmount, 10);
  const feeAmtValid = !isNaN(feeAmtNum) && feeAmtNum >= 0 && feeAmtNum <= 10000;
  const canSave = editable && isDirty && dayValid && prefixValid && (!lateFeeEnabled || (graceValid && feeAmtValid)) && !saving;

  const handleSave = useCallback(async () => {
    const req: UpdateAcademySettingsRequest = {};
    if (receiptPrefix !== settings.receiptPrefix) {
      req.receiptPrefix = receiptPrefix;
    }
    if (dueDateDay !== String(settings.defaultDueDateDay)) {
      req.defaultDueDateDay = parseInt(dueDateDay, 10);
    }
    if (lateFeeEnabled !== settings.lateFeeEnabled) {
      req.lateFeeEnabled = lateFeeEnabled;
    }
    if (gracePeriodDays !== String(settings.gracePeriodDays)) {
      req.gracePeriodDays = parseInt(gracePeriodDays, 10);
    }
    if (lateFeeAmount !== String(settings.lateFeeAmountInr)) {
      req.lateFeeAmountInr = parseInt(lateFeeAmount, 10);
    }
    if (repeatInterval !== settings.lateFeeRepeatIntervalDays) {
      req.lateFeeRepeatIntervalDays = repeatInterval;
    }

    const saveError = await onSave(req);
    if (!saveError) {
      showToast('Settings updated successfully');
    }
  }, [receiptPrefix, dueDateDay, lateFeeEnabled, gracePeriodDays, lateFeeAmount, repeatInterval, settings, onSave, showToast]);

  return (
    <View testID="settings-form">
      <Input
        label="Receipt Prefix"
        value={receiptPrefix}
        onChangeText={setReceiptPrefix}
        editable={editable}
        maxLength={20}
        placeholder="e.g. PC"
        error={editable && !prefixValid && receiptPrefix.length === 0 ? 'Required' : undefined}
        testID="input-receipt-prefix"
      />

      <Input
        label="Default Due Date Day (1–28)"
        value={dueDateDay}
        onChangeText={setDueDateDay}
        editable={editable}
        keyboardType="number-pad"
        maxLength={2}
        placeholder="e.g. 5"
        error={editable && !dayValid && dueDateDay.length > 0 ? 'Must be 1–28' : undefined}
        testID="input-due-date-day"
      />

      {/* Late Fee Section */}
      <View style={styles.sectionDivider} />
      <Text style={styles.sectionTitle}>Late Fee</Text>

      <View style={styles.switchRow}>
        <View style={styles.switchIcon}>
          {lateFeeEnabled ? (
            <LinearGradient
              colors={[gradient.start, gradient.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <AppIcon
            name="clock-alert-outline"
            size={20}
            color={lateFeeEnabled ? '#FFFFFF' : colors.textSecondary}
          />
        </View>
        <View style={styles.switchTextWrap}>
          <Text style={styles.switchLabel}>Enable Late Fee</Text>
          <Text style={styles.switchSubtitle}>
            {lateFeeEnabled
              ? 'A late fee will apply after the grace period'
              : 'Charge nothing extra when fees are paid late'}
          </Text>
        </View>
        <View
          style={[
            styles.switchStatusPill,
            lateFeeEnabled ? styles.switchStatusPillOn : styles.switchStatusPillOff,
          ]}
        >
          <View
            style={[
              styles.switchStatusDot,
              { backgroundColor: lateFeeEnabled ? colors.success : colors.textDisabled },
            ]}
          />
          <Text
            style={[
              styles.switchStatusText,
              { color: lateFeeEnabled ? colors.success : colors.textSecondary },
            ]}
          >
            {lateFeeEnabled ? 'On' : 'Off'}
          </Text>
        </View>
        <GradientSwitch
          value={lateFeeEnabled}
          onValueChange={setLateFeeEnabled}
          disabled={!editable}
          testID="switch-late-fee"
          accessibilityLabel="Enable late fee"
        />
      </View>

      {lateFeeEnabled && (
        <>
          <Input
            label="Grace Period (days, 0–30)"
            value={gracePeriodDays}
            onChangeText={setGracePeriodDays}
            editable={editable}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="e.g. 5"
            error={editable && !graceValid && gracePeriodDays.length > 0 ? 'Must be 0–30' : undefined}
            testID="input-grace-period"
          />

          <Input
            label="Late Fee Amount (INR)"
            value={lateFeeAmount}
            onChangeText={setLateFeeAmount}
            editable={editable}
            keyboardType="number-pad"
            maxLength={5}
            placeholder="e.g. 50"
            error={editable && !feeAmtValid && lateFeeAmount.length > 0 ? 'Must be 0–10000' : undefined}
            testID="input-late-fee-amount"
          />

          <Text style={styles.label}>Repeat Every (days)</Text>
          <View style={styles.intervalRow}>
            {REPEAT_INTERVALS.map((interval) => (
              <TouchableOpacity
                key={interval}
                style={[
                  styles.intervalBtn,
                  repeatInterval === interval && styles.intervalBtnActive,
                ]}
                onPress={() => editable && setRepeatInterval(interval)}
                disabled={!editable}
                testID={`interval-btn-${interval}`}
              >
                {repeatInterval === interval ? (
                  <LinearGradient
                    colors={[gradient.start, gradient.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <Text
                  style={[
                    styles.intervalBtnText,
                    repeatInterval === interval && { color: colors.white },
                  ]}
                >
                  {interval}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
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
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginVertical: spacing.sm,
    ...shadows.sm,
  },
  switchIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSubtle,
  },
  switchTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  switchLabel: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.1,
  },
  switchSubtitle: {
    marginTop: 2,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  switchStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  switchStatusPillOn: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  switchStatusPillOff: {
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
  },
  switchStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  switchStatusText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
  intervalRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  intervalBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  intervalBtnActive: {
    overflow: 'hidden',
  },
  intervalBtnText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
});
