import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type DatePickerInputProps = {
  value: string; // YYYY-MM-DD or ''
  onChange: (date: string) => void; // YYYY-MM-DD
  label?: string;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string;
  testID?: string;
};

// ── Date helpers (no external deps) ─────────────────────────────────────────

function toDateString(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseYMD(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split('-').map(Number);
  return { y: y!, m: m! - 1, d: d! };
}

function formatDisplay(dateStr: string): string {
  const { y, m, d } = parseYMD(dateStr);
  const date = new Date(y, m, d);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function startDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function todayString(): string {
  const now = new Date();
  return toDateString(now.getFullYear(), now.getMonth(), now.getDate());
}

// ── Component ───────────────────────────────────────────────────────────────

export function DatePickerInput({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
  error,
  testID,
}: DatePickerInputProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [show, setShow] = useState(false);

  // Calendar starts on the month of the current value (or today)
  const initial = value ? parseYMD(value) : (() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() }; })();
  const [viewYear, setViewYear] = useState(initial.y);
  const [viewMonth, setViewMonth] = useState(initial.m);

  const openPicker = useCallback(() => {
    // Reset view to the value's month when opening
    if (value) {
      const p = parseYMD(value);
      setViewYear(p.y);
      setViewMonth(p.m);
    } else {
      const now = new Date();
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
    }
    setShow(true);
  }, [value]);

  const goToPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const selectDate = useCallback((day: number) => {
    onChange(toDateString(viewYear, viewMonth, day));
    setShow(false);
  }, [viewYear, viewMonth, onChange]);

  const today = todayString();
  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay = startDayOfMonth(viewYear, viewMonth);

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  // Min/max as YYYY-MM-DD strings for comparison
  const minStr = minimumDate ? toDateString(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate()) : null;
  const maxStr = maximumDate ? toDateString(maximumDate.getFullYear(), maximumDate.getMonth(), maximumDate.getDate()) : null;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable
        style={[styles.inputWrapper, error ? styles.inputWrapperError : undefined]}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}, ${value ? formatDisplay(value) : placeholder}` : placeholder}
        testID={testID}
      >
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="calendar-outline" size={20} color={value ? colors.primary : colors.textDisabled} />
        <Text style={[styles.valueText, !value && styles.placeholderText]} numberOfLines={1}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="chevron-down" size={18} color={colors.textDisabled} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShow(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            {/* Month/year header */}
            <View style={styles.calHeader}>
              <Pressable onPress={goToPrevMonth} hitSlop={12} style={styles.navButton} testID={testID ? `${testID}-prev` : undefined}>
                {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                <Icon name="chevron-left" size={24} color={colors.text} />
              </Pressable>
              <Text style={styles.calTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
              <Pressable onPress={goToNextMonth} hitSlop={12} style={styles.navButton} testID={testID ? `${testID}-next` : undefined}>
                {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                <Icon name="chevron-right" size={24} color={colors.text} />
              </Pressable>
            </View>

            {/* Day-of-week labels */}
            <View style={styles.weekRow}>
              {DAY_LABELS.map((d) => (
                <Text key={d} style={styles.weekLabel}>{d}</Text>
              ))}
            </View>

            {/* Day grid */}
            <View style={styles.dayGrid}>
              {cells.map((day, idx) => {
                if (day === null) {
                  return <View key={`empty-${idx}`} style={styles.dayCell} />;
                }
                const ds = toDateString(viewYear, viewMonth, day);
                const isSelected = ds === value;
                const isToday = ds === today;
                const isDisabled = (minStr && ds < minStr) || (maxStr && ds > maxStr);

                return (
                  <Pressable
                    key={day}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      isToday && !isSelected && styles.dayCellToday,
                    ]}
                    onPress={() => !isDisabled && selectDate(day)}
                    disabled={!!isDisabled}
                    testID={testID ? `${testID}-day-${day}` : undefined}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isToday && !isSelected && styles.dayTextToday,
                        isDisabled && styles.dayTextDisabled,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Today shortcut */}
            <Pressable style={styles.todayButton} onPress={() => { const n = new Date(); selectDate(n.getDate()); setViewYear(n.getFullYear()); setViewMonth(n.getMonth()); }}>
              <Text style={styles.todayButtonText}>Today</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const CELL_SIZE = 40;

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
      padding: spacing.base,
      width: 7 * CELL_SIZE + spacing.base * 2 + 12,
      maxWidth: '92%',
    },

    // Calendar header
    calHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    navButton: {
      padding: spacing.xs,
      borderRadius: radius.full,
    },
    calTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },

    // Weekday labels
    weekRow: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
    },
    weekLabel: {
      width: CELL_SIZE,
      textAlign: 'center',
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
    },

    // Day grid
    dayGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: CELL_SIZE,
      height: CELL_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CELL_SIZE / 2,
    },
    dayCellSelected: {
      backgroundColor: colors.primary,
    },
    dayCellToday: {
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    dayText: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.medium,
      color: colors.text,
    },
    dayTextSelected: {
      color: colors.white,
      fontWeight: fontWeights.bold,
    },
    dayTextToday: {
      color: colors.primary,
      fontWeight: fontWeights.bold,
    },
    dayTextDisabled: {
      color: colors.textDisabled,
    },

    // Today button
    todayButton: {
      alignSelf: 'center',
      marginTop: spacing.md,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.sm,
    },
    todayButtonText: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.semibold,
      color: colors.primary,
    },
  });
