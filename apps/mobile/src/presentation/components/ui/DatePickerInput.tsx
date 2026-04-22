import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
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
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function todayString(): string {
  const now = new Date();
  return toDateString(now.getFullYear(), now.getMonth(), now.getDate());
}

// Year range for the year picker
const YEAR_RANGE_BEFORE = 100;
const YEAR_RANGE_AFTER = 5;

type PickerView = 'calendar' | 'year' | 'month';

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
  const [pickerView, setPickerView] = useState<PickerView>('calendar');

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
    setPickerView('calendar');
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

  const selectYear = useCallback((y: number) => {
    setViewYear(y);
    setPickerView('month');
  }, []);

  const selectMonth = useCallback((m: number) => {
    setViewMonth(m);
    setPickerView('calendar');
  }, []);

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

  // Year range
  const currentYear = new Date().getFullYear();
  const minYear = minimumDate ? minimumDate.getFullYear() : currentYear - YEAR_RANGE_BEFORE;
  const maxYear = maximumDate ? maximumDate.getFullYear() : currentYear + YEAR_RANGE_AFTER;
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);

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

        <AppIcon name="calendar-outline" size={20} color={value ? colors.primary : colors.textDisabled} />
        <Text style={[styles.valueText, !value && styles.placeholderText]} numberOfLines={1}>
          {value ? formatDisplay(value) : placeholder}
        </Text>

        <AppIcon name="chevron-down" size={18} color={colors.textDisabled} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShow(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>

            {/* ── Year picker view ── */}
            {pickerView === 'year' && (
              <>
                <View style={styles.calHeader}>
                  <View style={styles.navButton} />
                  <Text style={styles.calTitle}>Select Year</Text>
                  <Pressable onPress={() => setPickerView('calendar')} hitSlop={12} style={styles.navButton}>
                    <AppIcon name="close" size={22} color={colors.text} />
                  </Pressable>
                </View>
                <ScrollView
                  style={styles.yearScroll}
                  contentContainerStyle={styles.yearGrid}
                  showsVerticalScrollIndicator={false}
                >
                  {years.map((y) => {
                    const isSelected = y === viewYear;
                    const isCurrent = y === currentYear;
                    return (
                      <Pressable
                        key={y}
                        style={[
                          styles.yearCell,
                          isSelected && styles.yearCellSelected,
                          isCurrent && !isSelected && styles.yearCellCurrent,
                        ]}
                        onPress={() => selectYear(y)}
                      >
                        {isSelected ? (
                          <LinearGradient
                            colors={[gradient.start, gradient.end]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                          />
                        ) : null}
                        <Text
                          style={[
                            styles.yearText,
                            isSelected && styles.yearTextSelected,
                            isCurrent && !isSelected && styles.yearTextCurrent,
                          ]}
                        >
                          {y}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* ── Month picker view ── */}
            {pickerView === 'month' && (
              <>
                <View style={styles.calHeader}>
                  <Pressable onPress={() => setPickerView('year')} hitSlop={12} style={styles.navButton}>
                    <AppIcon name="chevron-left" size={24} color={colors.text} />
                  </Pressable>
                  <Text style={styles.calTitle}>{viewYear}</Text>
                  <Pressable onPress={() => setPickerView('calendar')} hitSlop={12} style={styles.navButton}>
                    <AppIcon name="close" size={22} color={colors.text} />
                  </Pressable>
                </View>
                <View style={styles.monthGrid}>
                  {MONTH_SHORT.map((name, idx) => {
                    const isSelected = idx === viewMonth && pickerView === 'month';
                    const isCurrent = idx === new Date().getMonth() && viewYear === currentYear;
                    return (
                      <Pressable
                        key={name}
                        style={[
                          styles.monthCell,
                          isSelected && styles.monthCellSelected,
                          isCurrent && !isSelected && styles.monthCellCurrent,
                        ]}
                        onPress={() => selectMonth(idx)}
                      >
                        {isSelected ? (
                          <LinearGradient
                            colors={[gradient.start, gradient.end]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                          />
                        ) : null}
                        <Text
                          style={[
                            styles.monthText,
                            isSelected && styles.monthTextSelected,
                            isCurrent && !isSelected && styles.monthTextCurrent,
                          ]}
                        >
                          {name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* ── Calendar view ── */}
            {pickerView === 'calendar' && (
              <>
                {/* Month/year header — tap title to open year picker */}
                <View style={styles.calHeader}>
                  <Pressable onPress={goToPrevMonth} hitSlop={12} style={styles.navButton} testID={testID ? `${testID}-prev` : undefined}>

                    <AppIcon name="chevron-left" size={24} color={colors.text} />
                  </Pressable>
                  <Pressable onPress={() => setPickerView('year')} hitSlop={8}>
                    <View style={styles.calTitleRow}>
                      <Text style={styles.calTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
                      <AppIcon name="chevron-down" size={16} color={colors.textSecondary} />
                    </View>
                  </Pressable>
                  <Pressable onPress={goToNextMonth} hitSlop={12} style={styles.navButton} testID={testID ? `${testID}-next` : undefined}>

                    <AppIcon name="chevron-right" size={24} color={colors.text} />
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
                        {isSelected ? (
                          <LinearGradient
                            colors={[gradient.start, gradient.end]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                          />
                        ) : null}
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
              </>
            )}

          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const CELL_SIZE = 44;

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
    calTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
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
      overflow: 'hidden',
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
      color: colors.text,
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
      color: colors.text,
    },

    // Year picker
    yearScroll: {
      maxHeight: 280,
    },
    yearGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingBottom: spacing.md,
    },
    yearCell: {
      width: 72,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.lg,
    },
    yearCellSelected: {
      overflow: 'hidden',
    },
    yearCellCurrent: {
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    yearText: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.medium,
      color: colors.text,
    },
    yearTextSelected: {
      color: colors.white,
      fontWeight: fontWeights.bold,
    },
    yearTextCurrent: {
      color: colors.text,
      fontWeight: fontWeights.bold,
    },

    // Month picker
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingBottom: spacing.md,
    },
    monthCell: {
      width: 80,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.lg,
    },
    monthCellSelected: {
      overflow: 'hidden',
    },
    monthCellCurrent: {
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    monthText: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.medium,
      color: colors.text,
    },
    monthTextSelected: {
      color: colors.white,
      fontWeight: fontWeights.bold,
    },
    monthTextCurrent: {
      color: colors.text,
      fontWeight: fontWeights.bold,
    },
  });
