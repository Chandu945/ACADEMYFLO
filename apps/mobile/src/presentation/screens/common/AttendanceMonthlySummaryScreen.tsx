import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AttendanceStackParamList } from '../../navigation/AttendanceStack';
import type { AppError } from '../../../domain/common/errors';
import type { MonthlySummaryItem } from '../../../domain/attendance/attendance.types';
import { getMonthlySummaryUseCase } from '../../../application/attendance/use-cases/get-monthly-summary.usecase';
import { getMonthlySummary } from '../../../infra/attendance/attendance-api';
import { exportMonthlyAttendanceSummaryPdfUseCase } from '../../../application/reports/use-cases/export-monthly-attendance-summary-pdf.usecase';
import { getMonthlyAttendanceSummaryPdfUrl } from '../../../infra/reports/reports-api';
import { pdfDownload } from '../../../infra/reports/pdf-download';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import { AppIcon } from '../../components/ui/AppIcon';
import { useToast } from '../../context/ToastContext';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Route = RouteProp<AttendanceStackParamList, 'MonthlySummary'>;
type Nav = NativeStackNavigationProp<AttendanceStackParamList, 'MonthlySummary'>;

const summaryApi = { getMonthlySummary };
const PAGE_SIZE = 50;

export function AttendanceMonthlySummaryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const month = route.params?.month ?? '';

  const [items, setItems] = useState<MonthlySummaryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();
  const mountedRef = useRef(true);
  const fetchingMoreRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleExportPdf = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await exportMonthlyAttendanceSummaryPdfUseCase(
        { pdfDownload, getExportUrl: getMonthlyAttendanceSummaryPdfUrl },
        month,
      );
      if (result.ok) {
        showToast('Report downloaded', 'success');
      } else {
        showToast(result.error.message ?? 'Could not download report', 'error');
      }
    } finally {
      if (mountedRef.current) setExporting(false);
    }
  }, [exporting, month, showToast]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText]);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await getMonthlySummaryUseCase(
          { attendanceApi: summaryApi },
          month,
          targetPage,
          PAGE_SIZE,
          debouncedSearch || undefined,
        );

        if (!mountedRef.current) return;

        if (result.ok) {
          if (append) {
            setItems((prev) => [...prev, ...result.value.items]);
          } else {
            setItems(result.value.items);
          }
          setPage(targetPage);
          setHasMore(targetPage < result.value.meta.totalPages);
        } else {
          setError(result.error);
        }
      } catch (e) {
        if (__DEV__) console.error('[AttendanceMonthlySummary] Load failed:', e);
        if (mountedRef.current) {
          setError({ code: 'UNKNOWN', message: 'Something went wrong.' });
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
          fetchingMoreRef.current = false;
        }
      }
    },
    [month, debouncedSearch],
  );

  const fetchMore = useCallback(() => {
    if (fetchingMoreRef.current || loading || loadingMore || !hasMore) return;
    fetchingMoreRef.current = true;
    load(page + 1, true);
  }, [loading, loadingMore, hasMore, page, load]);

  useEffect(() => {
    mountedRef.current = true;
    load(1, false);
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Refresh counts when the user navigates back from the daily attendance
  // screen — toggles there don't invalidate this view's cache, so without
  // this the P/A/H totals stay stale until an explicit pull-to-refresh.
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      load(1, false);
    }, [load]),
  );

  const handleRowPress = useCallback(
    (item: MonthlySummaryItem) => {
      navigation.navigate('StudentMonthlyAttendance', {
        studentId: item.studentId,
        fullName: item.fullName,
        month,
      });
    },
    [navigation, month],
  );

  const renderItem = useCallback(
    ({ item }: { item: MonthlySummaryItem }) => {
      const expected = item.presentCount + item.absentCount;
      const hasData = expected > 0;
      const pct = hasData ? Math.round((item.presentCount / expected) * 100) : null;
      const tone =
        pct == null
          ? 'neutral'
          : pct >= 90
            ? 'success'
            : pct >= 75
              ? 'warning'
              : 'danger';
      return (
        <Pressable
          style={[styles.row, styles[`rowStripe_${tone}`]]}
          onPress={() => handleRowPress(item)}
          accessibilityLabel={
            hasData
              ? `${item.fullName}: ${pct} percent attendance — ${item.presentCount} of ${expected} days present, ${item.holidayCount} holidays. Tap for details.`
              : `${item.fullName}: no scheduled days yet. Tap for details.`
          }
          accessibilityRole="button"
          testID={`summary-row-${item.studentId}`}
        >
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {item.fullName}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {hasData
                ? `${item.presentCount} of ${expected} days · ${item.holidayCount} holidays`
                : 'No scheduled days yet'}
            </Text>
          </View>
          <View style={[styles.pctBadge, styles[`pctBadge_${tone}`]]}>
            <Text style={[styles.pctText, styles[`pctText_${tone}`]]}>
              {hasData ? `${pct}%` : '—'}
            </Text>
          </View>
        </Pressable>
      );
    },
    [handleRowPress, styles],
  );

  const keyExtractor = useCallback((item: MonthlySummaryItem) => item.studentId, []);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [loadingMore, colors, styles]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Text style={styles.monthLabel}>
          {new Date(month + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable
          onPress={handleExportPdf}
          disabled={exporting || items.length === 0}
          style={({ pressed }) => [
            styles.exportBtn,
            (exporting || items.length === 0) && styles.exportBtnDisabled,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Export attendance summary as PDF"
          testID="export-attendance-summary-pdf"
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <AppIcon name="download" size={14} color={colors.primary} />
              <Text style={styles.exportBtnText}>Export PDF</Text>
            </>
          )}
        </Pressable>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search students..."
          placeholderTextColor={colors.textDisabled}
          value={searchText}
          onChangeText={setSearchText}
          accessibilityLabel="Search students by name"
          testID="monthly-summary-search-input"
        />
      </View>

      {error && <InlineError message={error.message} onRetry={() => load(1, false)} />}

      {loading ? (
        <View style={styles.skeletons}>
          <SkeletonTile />
          <SkeletonTile />
          <SkeletonTile />
        </View>
      ) : items.length === 0 ? (
        <EmptyState message="No attendance data" />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onEndReached={fetchMore}
          onEndReachedThreshold={0.3}
          removeClippedSubviews
          windowSize={11}
          maxToRenderPerBatch={5}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          testID="monthly-summary-list"
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  monthLabel: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    flexShrink: 1,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.primarySoft,
    minHeight: 30,
  },
  exportBtnDisabled: {
    opacity: 0.4,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.2,
  },
  searchContainer: {
    paddingHorizontal: spacing.base,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    fontSize: fontSizes.md,
    color: colors.text,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  skeletons: {
    padding: spacing.base,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs + 2,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    ...shadows.sm,
  },
  rowStripe_success: { borderLeftColor: colors.success },
  rowStripe_warning: { borderLeftColor: colors.warning },
  rowStripe_danger: { borderLeftColor: colors.danger },
  rowStripe_neutral: { borderLeftColor: colors.border },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  pctBadge: {
    minWidth: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pctBadge_success: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  pctBadge_warning: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
  },
  pctBadge_danger: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
  },
  pctBadge_neutral: {
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
  },
  pctText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.2,
  },
  pctText_success: { color: colors.successText },
  pctText_warning: { color: colors.warningText },
  pctText_danger: { color: colors.dangerText },
  pctText_neutral: { color: colors.textSecondary },
  footer: {
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
});
