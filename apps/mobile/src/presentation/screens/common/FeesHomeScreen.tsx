import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Keyboard,
  Modal,
  Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/ui/AppIcon';
import type { FeesStackParamList } from '../../navigation/FeesStack';
import { useAuth } from '../../context/AuthContext';
import { useFees } from '../../../application/fees/use-fees';
import { listUnpaidDues, listPaidDues } from '../../../infra/fees/fees-api';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { MonthPickerRow } from '../../components/fees/MonthPickerRow';
import { getBatchesCached } from '../../../infra/batch/batch-cache';
import type { BatchListItem } from '../../../domain/batch/batch.types';
import { ActiveFilterBar } from '../../components/ui/ActiveFilterBar';
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

type FilterChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
  styles: ReturnType<typeof makeStyles>;
  colors: Colors;
};

// Wrapped chip used in the Fees filter modal — mirrors the Audit-logs filter
// chip so all filter modals share the same look.
function FilterChip({ label, active, onPress, testID, styles, colors }: FilterChipProps) {
  return (
    <TouchableOpacity
      style={[styles.batchChip, active && styles.batchChipActive]}
      onPress={onPress}
      testID={testID}
      activeOpacity={0.75}
    >
      {active ? (
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {active && <AppIcon name="check" size={12} color="#FFFFFF" />}
      <Text
        style={[
          styles.batchChipText,
          active && styles.batchChipTextActive,
          { color: active ? '#FFFFFF' : colors.text },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
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
  const [batches, setBatches] = useState<BatchListItem[]>([]);

  // Load the batch list for the in-modal picker. Cached by `getBatchesCached`
  // so revisiting the screen / opening the modal is instant after the first hit.
  useEffect(() => {
    let cancelled = false;
    getBatchesCached().then((items) => {
      if (!cancelled) setBatches(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);
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
    <SafeAreaView style={styles.screen} edges={['bottom']}>
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

      {/* ── Active Filter Pills (visible when panel closed) ── */}
      {!showFilters && showSearchAndFilters && <ActiveFilterBar filters={activeFilters} onClearAll={clearAllFilters} />}

      {/* ── Filter Modal (centered dialog) ────────────── */}
      {(() => {
        if (!showSearchAndFilters) return null;
        const filterContent = (
          <View style={styles.filterModalOverlay}>
            <TouchableOpacity
              style={styles.filterModalBackdrop}
              activeOpacity={1}
              onPress={() => setShowFilters(false)}
            />
            <View style={styles.filterModalSheet}>
              <View style={styles.filterModalHeader}>
                <View style={styles.filterModalIconWrap}>
                  <LinearGradient
                    colors={[gradient.start, gradient.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <AppIcon name="filter-variant" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.filterModalTitleWrap}>
                  <Text style={styles.filterModalTitle}>Filter Fees</Text>
                  <Text style={styles.filterModalSubtitle}>
                    Pick a batch to narrow the results
                  </Text>
                </View>
                {selectedBatchId !== null && (
                  <TouchableOpacity
                    onPress={clearAllFilters}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.filterModalClear}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.filterDivider} />

              <View style={styles.filterSectionLabelRow}>
                <AppIcon name="account-group-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.filterCardTitle}>Batch</Text>
              </View>

              {/* Wrapped chip grid — every batch visible at once, no horizontal
                  scrolling. Scrollable container as a fallback for very long lists. */}
              <ScrollView
                style={styles.filterChipsScroll}
                contentContainerStyle={styles.filterChipsWrap}
                showsVerticalScrollIndicator={false}
              >
                <FilterChip
                  active={selectedBatchId === null}
                  onPress={() => handleBatchChange(null)}
                  testID="fees-batch-all"
                  styles={styles}
                  colors={colors}
                  label="All Batches"
                />
                {batches.map((batch) => (
                  <FilterChip
                    key={batch.id}
                    active={selectedBatchId === batch.id}
                    onPress={() => handleBatchChange(batch.id, batch.batchName)}
                    testID={`fees-batch-${batch.id}`}
                    styles={styles}
                    colors={colors}
                    label={batch.batchName}
                  />
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.filterApplyBtn}
                onPress={() => setShowFilters(false)}
                activeOpacity={0.85}
              >
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
        return (
          <Modal
            visible={showFilters}
            transparent
            animationType="fade"
            onRequestClose={() => setShowFilters(false)}
            statusBarTranslucent
          >
            {filterContent}
          </Modal>
        );
      })()}

      {/* ── Controls — always visible. The filter modal floats above this
          content, so hiding the date/segment row would just create awkward
          empty space behind the dialog. */}
      <View style={styles.controlsSection}>
        <MonthPickerRow month={month} onPrevious={goToPrev} onNext={goToNext} />
        <SegmentedControl
          segments={segments}
          selectedIndex={selectedSegment}
          onSelect={handleSegmentChange}
          testID="fees-segments"
        />
      </View>

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
    </SafeAreaView>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  filterModalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterModalTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  filterModalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  filterModalSubtitle: {
    marginTop: 2,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  filterModalClear: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.danger,
  },
  filterDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  filterSectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  filterCardTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChipsScroll: {
    maxHeight: 280,
    flexGrow: 0,
  },
  filterChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    paddingBottom: spacing.sm,
  },
  batchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  batchChipActive: {
    borderColor: 'transparent',
  },
  batchChipText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.2,
  },
  batchChipTextActive: {
    color: '#FFFFFF',
  },
  filterApplyBtn: {
    overflow: 'hidden',
    borderRadius: radius.full,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  filterApplyText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  /* ── Controls ──────────────────────────────────── */
  controlsSection: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
});
