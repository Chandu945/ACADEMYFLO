import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type TimePickerInputProps = {
  value: string; // HH:MM (24h) or ''
  onChange: (time: string) => void; // HH:MM (24h)
  label?: string;
  placeholder?: string;
  error?: string;
  testID?: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function format12h(h24: number, m: number): string {
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${pad2(m)} ${period}`;
}

function parse24(value: string): { h: number; m: number } {
  const [h, m] = value.split(':').map(Number);
  return { h: h ?? 6, m: m ?? 0 };
}

export function TimePickerInput({
  value,
  onChange,
  label,
  placeholder = 'Select time',
  error,
  testID,
}: TimePickerInputProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [show, setShow] = useState(false);

  // Picker state (12h internally for display)
  const initial = value ? parse24(value) : { h: 6, m: 0 };
  const [hour12, setHour12] = useState(() => {
    const h = initial.h % 12 || 12;
    return h;
  });
  const [minute, setMinute] = useState(initial.m);
  const [isPM, setIsPM] = useState(() => initial.h >= 12);

  const openPicker = useCallback(() => {
    if (value) {
      const p = parse24(value);
      setHour12(p.h % 12 || 12);
      setMinute(p.m);
      setIsPM(p.h >= 12);
    } else {
      setHour12(6);
      setMinute(0);
      setIsPM(false);
    }
    setShow(true);
  }, [value]);

  const handleConfirm = useCallback(() => {
    let h24 = hour12 % 12;
    if (isPM) h24 += 12;
    onChange(`${pad2(h24)}:${pad2(minute)}`);
    setShow(false);
  }, [hour12, minute, isPM, onChange]);

  const incHour = useCallback(() => setHour12((h) => (h % 12) + 1), []);
  const decHour = useCallback(() => setHour12((h) => h <= 1 ? 12 : h - 1), []);
  const incMin = useCallback(() => setMinute((m) => (m + 5) % 60), []);
  const decMin = useCallback(() => setMinute((m) => (m - 5 + 60) % 60), []);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable
        style={[styles.inputWrapper, error ? styles.inputWrapperError : undefined]}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}, ${value ? format12h(parse24(value).h, parse24(value).m) : placeholder}` : placeholder}
        testID={testID}
      >
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="clock-outline" size={20} color={value ? colors.primary : colors.textDisabled} />
        <Text style={[styles.valueText, !value && styles.placeholderText]} numberOfLines={1}>
          {value ? format12h(parse24(value).h, parse24(value).m) : placeholder}
        </Text>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="chevron-down" size={18} color={colors.textDisabled} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShow(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select Time</Text>

            {/* Spinner Row */}
            <View style={styles.spinnerRow}>
              {/* Hour */}
              <View style={styles.spinnerCol}>
                <Text style={styles.spinnerLabel}>Hour</Text>
                <Pressable onPress={incHour} style={styles.spinnerBtn} testID={testID ? `${testID}-hour-up` : undefined}>
                  {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                  <Icon name="chevron-up" size={28} color={colors.primary} />
                </Pressable>
                <View style={styles.spinnerValue}>
                  <Text style={styles.spinnerValueText}>{pad2(hour12)}</Text>
                </View>
                <Pressable onPress={decHour} style={styles.spinnerBtn} testID={testID ? `${testID}-hour-down` : undefined}>
                  {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                  <Icon name="chevron-down" size={28} color={colors.primary} />
                </Pressable>
              </View>

              <Text style={styles.spinnerColon}>:</Text>

              {/* Minute */}
              <View style={styles.spinnerCol}>
                <Text style={styles.spinnerLabel}>Min</Text>
                <Pressable onPress={incMin} style={styles.spinnerBtn} testID={testID ? `${testID}-min-up` : undefined}>
                  {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                  <Icon name="chevron-up" size={28} color={colors.primary} />
                </Pressable>
                <View style={styles.spinnerValue}>
                  <Text style={styles.spinnerValueText}>{pad2(minute)}</Text>
                </View>
                <Pressable onPress={decMin} style={styles.spinnerBtn} testID={testID ? `${testID}-min-down` : undefined}>
                  {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                  <Icon name="chevron-down" size={28} color={colors.primary} />
                </Pressable>
              </View>

              {/* AM/PM */}
              <View style={styles.ampmCol}>
                <Pressable
                  style={[styles.ampmBtn, !isPM && styles.ampmBtnActive]}
                  onPress={() => setIsPM(false)}
                  testID={testID ? `${testID}-am` : undefined}
                >
                  <Text style={[styles.ampmText, !isPM && styles.ampmTextActive]}>AM</Text>
                </Pressable>
                <Pressable
                  style={[styles.ampmBtn, isPM && styles.ampmBtnActive]}
                  onPress={() => setIsPM(true)}
                  testID={testID ? `${testID}-pm` : undefined}
                >
                  <Text style={[styles.ampmText, isPM && styles.ampmTextActive]}>PM</Text>
                </Pressable>
              </View>
            </View>

            {/* Preview */}
            <Text style={styles.preview}>{format12h(isPM ? (hour12 % 12) + 12 : hour12 % 12, minute)}</Text>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShow(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmBtn} onPress={handleConfirm} testID={testID ? `${testID}-confirm` : undefined}>
                <Text style={styles.confirmText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      marginBottom: spacing.base,
    },
    label: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      paddingVertical: 12,
      paddingHorizontal: spacing.base,
      gap: spacing.sm,
    },
    inputWrapperError: {
      borderColor: colors.danger,
      backgroundColor: colors.dangerBg,
    },
    valueText: {
      flex: 1,
      fontSize: fontSizes.base,
      color: colors.text,
    },
    placeholderText: {
      color: colors.textDisabled,
    },
    error: {
      fontSize: fontSizes.sm,
      color: colors.danger,
      marginTop: spacing.xs,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.overlay,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
      width: 300,
      maxWidth: '92%',
    },
    modalTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },

    // Spinner
    spinnerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    spinnerCol: {
      alignItems: 'center',
    },
    spinnerLabel: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      fontWeight: fontWeights.medium,
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
    },
    spinnerBtn: {
      width: 48,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
    },
    spinnerValue: {
      width: 64,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bgSubtle,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    spinnerValueText: {
      fontSize: fontSizes['3xl'],
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    spinnerColon: {
      fontSize: fontSizes['3xl'],
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginTop: spacing.xl,
    },

    // AM/PM
    ampmCol: {
      marginLeft: spacing.sm,
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    ampmBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    ampmBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    ampmText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
    },
    ampmTextActive: {
      color: colors.white,
    },

    // Preview
    preview: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.semibold,
      color: colors.primary,
      textAlign: 'center',
      marginTop: spacing.lg,
    },

    // Actions
    actions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    cancelBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.medium,
      color: colors.textSecondary,
    },
    confirmBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: radius.xl,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    confirmText: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.semibold,
      color: colors.white,
    },
  });
