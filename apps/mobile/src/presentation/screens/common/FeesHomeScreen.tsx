import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/ui/AppIcon';
import type { FeesStackParamList } from '../../navigation/FeesStack';
import { useAuth } from '../../context/AuthContext';
import { useFees } from '../../../application/fees/use-fees';
import { listUnpaidDues, listPaidDues } from '../../../infra/fees/fees-api';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { MonthPickerRow } from '../../components/fees/MonthPickerRow';
import { BatchFilterBar } from '../../components/attendance/BatchFilterBar';
import { ActiveFilterBar } from '../../components/ui/ActiveFilterBar';
import { SubscriptionBanner } from '../../components/dashboard/SubscriptionBanner';
import type { ActiveFilter } from '../../components/ui/ActiveFilterBar';
import { listBatchStudents } from '../../../infra/batch/batch-api';
import { UnpaidDuesScreen } from './UnpaidDuesScreen';
import { PaidFeesScreen } from './PaidFeesScreen';
import { PendingApprovalsScreen } from '../owner/PendingApprovalsScreen';
import { MyPaymentRequestsScreen } from '../staff/MyPaymentRequestsScreen';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { animateLayout } from '../../utils/layout-animation';

type Nav = NativeStackNavigationProp<FeesStackParamList, 'FeesHome'>;

const feesApiRef = { listUnpaidDues, listPaidDues };

function addMonths(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1 + delta, 1);
  const ny = d.getFullYear();
  const nm = String(d.getMonth() + 1).padStart(2, '0');
  return `${ny}-${nm}`;
}

function formatMonthLabel(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function FeesHomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const segments = isOwner ? ['Unpaid', 'Paid', 'Approvals'] : ['Unpaid', 'Paid', 'My Requests'];

  const [selectedSegment, setSelectedSegment] = useState(0);
  const {
    unpaidItems, paidItems, loading, error, month, setMonth, refetch,
    unpaidTotal, hasMoreUnpaid, loadingMoreUnpaid, fetchMoreUnpaid,
  } = useFees(feesApiRef);

  const [searchActive, setSearchActive] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedBatchName, setSelectedBatchName] = useState<string | null>(null);
  const [batchStudentIds, setBatchStudentIds] = useState<Set<string> | null>(null);
  const mountedRef = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  // Build student name map from fee items (no separate API call needed).
  // Identity-stable: the returned ref only changes when a NEW name-id pair
  // appears. Prevents FlatList `extraData` churn when the same items reload
  // (same names, different array identity).
  const studentNameMapRef = useRef<Record<string, string>>({});
  const studentNameMap = useMemo(() => {
    const current = studentNameMapRef.current;
    let next: Record<string, string> | null = null;
    for (const item of [...unpaidItems, ...paidItems]) {
      if (item.studentName && current[item.studentId] !== item.studentName) {
        if (!next) next = { ...current };
        next[item.studentId] = item.studentName;
      }
    }
    if (next) {
      studentNameMapRef.current = next;
      return next;
    }
    return current;
  }, [unpaidItems, paidItems]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Refresh fees each time screen gains focus
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText]);

  useEffect(() => {
    if (!selectedBatchId) {
      setBatchStudentIds(null);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        // Backend caps pageSize at 100. Paginate to support batches of any size.
        // Hard-cap at 20 pages (2000 students) as a safety belt against runaway loops.
        // TODO: server-side batch filter on /fees/dues would eliminate this round-trip.
        const ids = new Set<string>();
        const PAGE_SIZE = 100;
        const MAX_PAGES = 20;
        for (let page = 1; page <= MAX_PAGES; page++) {
          const result = await listBatchStudents(selectedBatchId!, page, PAGE_SIZE);
          if (cancelled || !mountedRef.current) return;
          if (!result.ok) return;
          for (const s of result.value.data) ids.add(s.id);
          if (page >= result.value.meta.totalPages) break;
        }
        if (!cancelled && mountedRef.current) setBatchStudentIds(ids);
      } catch {
        // Silently fail — show all students without batch filter
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedBatchId]);

  const filteredUnpaidItems = useMemo(() => {
    let items = unpaidItems;
    if (batchStudentIds) {
      items = items.filter((item) => batchStudentIds.has(item.studentId));
    }
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      items = items.filter((item) => {
        const name = studentNameMap[item.studentId];
        return name && name.toLowerCase().includes(searchLower);
      });
    }
    return items;
  }, [unpaidItems, debouncedSearch, studentNameMap, batchStudentIds]);

  const filteredPaidItems = useMemo(() => {
    let items = paidItems;
    if (batchStudentIds) {
      items = items.filter((item) => batchStudentIds.has(item.studentId));
    }
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      items = items.filter((item) => {
        const name = studentNameMap[item.studentId];
        return name && name.toLowerCase().includes(searchLower);
      });
    }
    return items;
  }, [paidItems, debouncedSearch, studentNameMap, batchStudentIds]);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const arr: ActiveFilter[] = [];
    if (selectedBatchId) {
      arr.push({
        key: 'batch',
        label: 'Batch',
        value: selectedBatchName ?? 'Selected',
        onRemove: () => {
          setSelectedBatchId(null);
          setSelectedBatchName(null);
        },
      });
    }
    return arr;
  }, [selectedBatchId, selectedBatchName]);

  const clearAllFilters = useCallback(() => {
    setSelectedBatchId(null);
    setSelectedBatchName(null);
  }, []);

  const handleBatchChange = useCallback((id: string | null, name?: string) => {
    setSelectedBatchId(id);
    setSelectedBatchName(name ?? null);
  }, []);

  const toggleFilters = useCallback(() => {
    animateLayout();
    setShowFilters((v) => !v);
  }, []);

  const goToPrev = useCallback(() => {
    setMonth(addMonths(month, -1));
  }, [month, setMonth]);

  const goToNext = useCallback(() => {
    setMonth(addMonths(month, 1));
  }, [month, setMonth]);

  const handleFeeRowPress = useCallback(
    (studentId: string) => {
      navigation.navigate('StudentFeeDetail', {
        studentId,
        studentName: studentNameMap[studentId] ?? 'Student',
      });
    },
    [navigation, studentNameMap],
  );

  const openSearch = useCallback(() => {
    setSearchActive(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  const closeSearch = useCallback(() => {
    Keyboard.dismiss();
    setSearchActive(false);
    setSearchText('');
    setDebouncedSearch('');
  }, []);

  // Clear search/filters when switching to Approvals/My Requests
  const handleSegmentChange = useCallback((index: number) => {
    setSelectedSegment(index);
    if (index === 2) {
      if (searchActive) closeSearch();
      clearAllFilters();
    }
  }, [searchActive, closeSearch, clearAllFilters]);

  const showSearchAndFilters = selectedSegment !== 2;

  return (
    <View style={styles.screen}>
      {/* ── Navbar ─────────────────────────────────────── */}
      <View style={styles.navbar}>
        {searchActive && showSearchAndFilters ? (
          <View style={styles.searchBar}>
            <TouchableOpacity
              onPress={closeSearch}
              style={styles.navBtn}
              accessibilityLabel="Close search"
              accessibilityRole="button"
            >
              <AppIcon name="arrow-left" size={22} color={colors.text} />
            </TouchableOpacity>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search by student name"
              placeholderTextColor={colors.textDisabled}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
              autoFocus
              accessibilityLabel="Search fees by student name"
              testID="fees-search-input"
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchText('')}
                style={styles.navBtn}
                accessibilityLabel="Clear search text"
                accessibilityRole="button"
              >
                <AppIcon name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.titleBar}>
            <View>
              <Text style={styles.navTitle}>Fees</Text>
              <Text style={styles.navSubtitle}>{formatMonthLabel(month)}</Text>
            </View>
            {showSearchAndFilters && (
              <View style={styles.navActions}>
                <TouchableOpacity onPress={openSearch} style={styles.navBtn} testID="search-button" accessibilityLabel="Search students" accessibilityRole="button">
                  <AppIcon name="magnify" size={22} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={toggleFilters}
                  style={[styles.navBtn, showFilters && styles.navBtnActive]}
                  testID="filter-button"
                  accessibilityLabel="Toggle filters"
                  accessibilityRole="button"
                >
                  <AppIcon
                    name={showFilters ? 'filter-variant-remove' : 'filter-variant'}
                    size={22}
                    color={showFilters ? colors.primary : colors.text}
                  />
                  {selectedBatchId !== null && !showFilters && (
                    <View style={styles.filterBadge}>
                      <LinearGradient
                        colors={[gradient.start, gradient.end]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <Text style={styles.filterBadgeText}>1</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      <SubscriptionBanner />
      {/* ── Active Filter Pills (visible when panel closed) ── */}
      {!showFilters && showSearchAndFilters && <ActiveFilterBar filters={activeFilters} onClearAll={clearAllFilters} />}

      {/* ── Filter Modal ──────────────────────────────── */}
      {(() => {
        if (!showSearchAndFilters) return null;
        const filterContent = (
          <View style={styles.filterModalOverlay}>
            <TouchableOpacity style={styles.filterModalBackdrop} activeOpacity={1} onPress={() => setShowFilters(false)} />
            <View style={styles.filterModalSheet}>
              <View style={styles.filterModalHandle} />
              <View style={styles.filterModalHeader}>
                <Text style={styles.filterModalTitle}>Filters</Text>
                {selectedBatchId !== null && (
                  <TouchableOpacity onPress={clearAllFilters} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.filterModalClear}>Clear All</Text>
                  </TouchableOpacity>
                )}
              </View>

              <MonthPickerRow month={month} onPrevious={goToPrev} onNext={goToNext} />
              <SegmentedControl
                segments={segments}
                selectedIndex={selectedSegment}
                onSelect={handleSegmentChange}
                testID="fees-segments"
              />
              <View style={styles.filterCard}>
                <View style={styles.filterCardHeader}>
                  <AppIcon name="account-group-outline" size={15} color={colors.textSecondary} />
                  <Text style={styles.filterCardTitle}>Batch</Text>
                </View>
                <BatchFilterBar selectedBatchId={selectedBatchId} onChange={handleBatchChange} />
              </View>

              <TouchableOpacity style={styles.filterApplyBtn} onPress={() => setShowFilters(false)}>
                <LinearGradient
                  colors={[gradient.start, gradient.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.filterApplyText}>Show Results</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

        if (!showFilters) return null;
        if (Platform.OS === 'web') return filterContent;
        return <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>{filterContent}</Modal>;
      })()}

      {/* ── Controls (always visible when filter panel is closed) ── */}
      {!showFilters && (
        <View style={styles.controlsSection}>
          <MonthPickerRow month={month} onPrevious={goToPrev} onNext={goToNext} />
          <SegmentedControl
            segments={segments}
            selectedIndex={selectedSegment}
            onSelect={handleSegmentChange}
            testID="fees-segments"
          />
        </View>
      )}

      {selectedSegment === 0 && (
        <UnpaidDuesScreen
          items={filteredUnpaidItems}
          loading={loading}
          error={error}
          onRetry={refetch}
          onRowPress={handleFeeRowPress}
          month={month}
          onMarkPaidSuccess={refetch}
          studentNameMap={studentNameMap}
          loadingMore={loadingMoreUnpaid}
          onEndReached={fetchMoreUnpaid}
          total={unpaidTotal}
          skeletonCount={Math.min(8, Math.max(3, unpaidTotal || 5))}
        />
      )}
      {selectedSegment === 1 && (
        <PaidFeesScreen
          items={filteredPaidItems}
          loading={loading}
          error={error}
          onRetry={refetch}
          onRowPress={handleFeeRowPress}
          studentNameMap={studentNameMap}
        />
      )}
      {selectedSegment === 2 &&
        (isOwner ? (
          <PendingApprovalsScreen onActionComplete={refetch} />
        ) : (
          <MyPaymentRequestsScreen />
        ))}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  /* ── Navbar ─────────────────────────────────────── */
  navbar: {
    backgroundColor: colors.bg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  navTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  navSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnActive: {
    backgroundColor: colors.bgSubtle,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.text,
    paddingVertical: 8,
    marginLeft: spacing.xs,
  },

  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    overflow: 'hidden',
    borderRadius: radius.full,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },

  /* ── Filter Modal ──────────────────────────────── */
  filterModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    ...(Platform.OS === 'web' ? { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 } : {}),
  },
  filterModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  filterModalSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl + 4,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    width: '100%',
    maxWidth: 400,
  },
  filterModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterModalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  filterModalClear: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.danger,
  },
  filterApplyBtn: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  filterApplyText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  filterCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  filterCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterCardTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ── Controls ──────────────────────────────────── */
  controlsSection: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
});
