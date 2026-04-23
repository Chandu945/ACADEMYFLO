import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../ui/AppIcon';
import type { BatchListItem } from '../../../domain/batch/batch.types';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  visible: boolean;
  batches: BatchListItem[];
  loading: boolean;
  selectedBatchId: string | null;
  onSelect: (batchId: string, batchName: string) => void;
  onClose: () => void;
};

// Bottom sheet for choosing a batch before marking attendance. Differs from
// BatchFilterBar: there's no "All Batches" option — marking is always scoped
// to one session.
export function BatchPickerSheet({
  visible,
  batches,
  loading,
  selectedBatchId,
  onSelect,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Reserve room for the OS gesture bar and the bottom tab bar that sits
  // above it — without this the last list item is clipped by the tabs.
  const TAB_BAR_HEIGHT = 64;
  const bottomReserve = insets.bottom + TAB_BAR_HEIGHT + spacing.md;

  const sheet = (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: 0 }]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <LinearGradient
              colors={[gradient.start, gradient.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <AppIcon name="account-group-outline" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Select Batch</Text>
            <Text style={styles.subtitle}>
              Attendance is marked per session. Pick the batch you're marking.
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomReserve },
          ]}
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : batches.length === 0 ? (
            <View style={styles.emptyRow}>
              <AppIcon name="account-group-outline" size={32} color={colors.textDisabled} />
              <Text style={styles.emptyText}>
                No batches yet. Create one in More → Batches first.
              </Text>
            </View>
          ) : (
            batches.map((batch) => {
              const isSelected = batch.id === selectedBatchId;
              return (
                <Pressable
                  key={batch.id}
                  style={[styles.row, isSelected && styles.rowSelected]}
                  onPress={() => onSelect(batch.id, batch.batchName)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  testID={`batch-picker-${batch.id}`}
                >
                  <View style={styles.rowIcon}>
                    {isSelected ? (
                      <>
                        <LinearGradient
                          colors={[gradient.start, gradient.end]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <AppIcon name="check" size={18} color="#FFFFFF" />
                      </>
                    ) : (
                      <Text style={styles.rowIconLetter}>
                        {batch.batchName.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {batch.batchName}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {formatSchedule(batch)}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.selectedPill}>
                      <Text style={styles.selectedPillText}>Selected</Text>
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );

  if (!visible) return null;
  if (Platform.OS === 'web') return sheet;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      // Covers the status bar on Android so the sheet visually overlays the
      // whole screen instead of leaving a lit strip behind.
      statusBarTranslucent
    >
      {sheet}
    </Modal>
  );
}

function formatSchedule(batch: BatchListItem): string {
  const days = batch.days.length > 0 ? batch.days.join(', ') : 'No schedule set';
  const time =
    batch.startTime && batch.endTime
      ? ` · ${batch.startTime} – ${batch.endTime}`
      : batch.startTime
        ? ` · ${batch.startTime}`
        : '';
  return `${days}${time}`;
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      ...(Platform.OS === 'web'
        ? { position: 'fixed' as unknown as 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }
        : {}),
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl + 4,
      borderTopRightRadius: radius.xl + 4,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing['2xl'],
      // A bounded height lets the inner ScrollView be scrollable. Without
      // this the list lays out at full content height and overflows.
      maxHeight: '90%',
      minHeight: '55%',
      ...shadows.sm,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    subtitle: {
      marginTop: 2,
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    list: {
      // `flex: 1` is what actually makes the ScrollView scrollable inside a
      // parent with `maxHeight`. Without it the scroll view sizes to content
      // and the last rows end up clipped by the tab bar below the sheet.
      flex: 1,
      marginTop: spacing.sm,
    },
    listContent: {
      paddingVertical: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.lg,
      gap: spacing.md,
    },
    rowSelected: {
      backgroundColor: colors.bgSubtle,
    },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bgSubtle,
    },
    rowIconLetter: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.bold,
      color: colors.textSecondary,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
    },
    rowName: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    rowMeta: {
      marginTop: 2,
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
    },
    selectedPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: colors.bgSubtle,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectedPillText: {
      fontSize: 10,
      fontWeight: fontWeights.bold,
      color: colors.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    loadingRow: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    emptyRow: {
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.sm,
    },
    emptyText: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
