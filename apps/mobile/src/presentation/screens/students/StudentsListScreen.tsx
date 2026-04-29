import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Keyboard,
  Modal,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/ui/AppIcon';
import type { StudentsStackParamList } from '../../navigation/StudentsStack';
import type {
  StudentStatus,
  FeeFilter,
  StudentListItem,
  StudentListFilters,
} from '../../../domain/student/student.types';
import { useStudents } from '../../../application/student/use-students';
import { listStudents } from '../../../infra/student/student-api';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import { StudentRow } from '../../components/students/StudentRow';
import { StudentActionMenu } from '../../components/student/StudentActionMenu';
import { SubscriptionBanner } from '../../components/dashboard/SubscriptionBanner';
import { BatchFilterBar } from '../../components/attendance/BatchFilterBar';
import { ActiveFilterBar } from '../../components/ui/ActiveFilterBar';
import type { ActiveFilter } from '../../components/ui/ActiveFilterBar';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { animateLayout } from '../../utils/layout-animation';
import { getCurrentMonthIST } from '../../../domain/common/date-utils';

type Nav = NativeStackNavigationProp<StudentsStackParamList, 'StudentsList'>;

const studentsApi = { listStudents };

function getCurrentMonth(): string {
  return getCurrentMonthIST();
}

const STATUS_OPTIONS: { label: string; value: StudentStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Left', value: 'LEFT' },
];

const FEE_OPTIONS: { label: string; value: FeeFilter | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Due', value: 'DUE' },
  { label: 'Paid', value: 'PAID' },
];

export function StudentsListScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const [searchActive, setSearchActive] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentStatus | undefined>(undefined);
  const [feeFilter, setFeeFilter] = useState<FeeFilter | undefined>(undefined);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedBatchName, setSelectedBatchName] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [month] = useState(getCurrentMonth);
  const [refreshing, setRefreshing] = useState(false);
  const [actionMenuStudent, setActionMenuStudent] = useState<StudentListItem | null>(null);
  const lastActionMenuStudentRef = useRef<StudentListItem | null>(null);
  if (actionMenuStudent) lastActionMenuStudentRef.current = actionMenuStudent;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const fabScale = useRef(new Animated.Value(1)).current;

  // Search debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText]);

  const filters: StudentListFilters = useMemo(
    () => ({
      status: statusFilter,
      search: debouncedSearch || undefined,
      feeFilter: feeFilter,
      month: feeFilter && feeFilter !== 'ALL' ? month : undefined,
      batchId: selectedBatchId ?? undefined,
    }),
    [statusFilter, debouncedSearch, feeFilter, month, selectedBatchId],
  );

  const { items, totalItems, loading, loadingMore, error, refetch, fetchMore } = useStudents(
    filters,
    studentsApi,
  );

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

  const activeFilterCount =
    (statusFilter ? 1 : 0) + (feeFilter ? 1 : 0) + (selectedBatchId ? 1 : 0);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const arr: ActiveFilter[] = [];
    if (statusFilter) {
      const label = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter;
      arr.push({
        key: 'status',
        label: 'Status',
        value: label,
        onRemove: () => setStatusFilter(undefined),
      });
    }
    if (feeFilter) {
      const label = FEE_OPTIONS.find((o) => o.value === feeFilter)?.label ?? feeFilter;
      arr.push({
        key: 'fee',
        label: 'Fee',
        value: label,
        onRemove: () => setFeeFilter(undefined),
      });
    }
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
  }, [statusFilter, feeFilter, selectedBatchId, selectedBatchName]);

  const clearAllFilters = useCallback(() => {
    setStatusFilter(undefined);
    setFeeFilter(undefined);
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // Error handled by the hook
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleRowPress = useCallback(
    (student: StudentListItem) => {
      navigation.navigate('StudentDetail', { student });
    },
    [navigation],
  );

  const handleAdd = useCallback(() => {
    navigation.navigate('StudentForm', { mode: 'create' });
  }, [navigation]);

  const handleLongPress = useCallback((student: StudentListItem) => {
    setActionMenuStudent(student);
  }, []);

  const openSearch = useCallback(() => {
    setSearchActive(true);
    // Let React render the input, then focus it
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  const closeSearch = useCallback(() => {
    Keyboard.dismiss();
    setSearchActive(false);
    setSearchText('');
    setDebouncedSearch('');
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: StudentListItem }) => (
      <StudentRow
        student={item}
        onPress={handleRowPress}
        onLongPress={handleLongPress}
      />
    ),
    [handleRowPress, handleLongPress],
  );

  const keyExtractor = useCallback((item: StudentListItem) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [loadingMore, colors, styles]);

  const handleFabPressIn = () => {
    Animated.spring(fabScale, { toValue: 0.9, useNativeDriver: true }).start();
  };
  const handleFabPressOut = () => {
    Animated.spring(fabScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* ── Navbar ─────────────────────────────────────── */}
      <View style={styles.navbar}>
        {searchActive ? (
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
              placeholder="Search by name"
              placeholderTextColor={colors.textDisabled}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
              autoFocus
              accessibilityLabel="Search students by name"
              testID="search-input"
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
              <Text style={styles.navTitle}>Students</Text>
              <Text style={styles.navSubtitle}>
                {totalItems} {totalItems === 1 ? 'student' : 'students'} found
              </Text>
            </View>
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
                {activeFilterCount > 0 && !showFilters && (
                  <View style={styles.filterBadge}>
                    <LinearGradient
                      colors={[gradient.start, gradient.end]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── Active Filter Pills (visible when panel closed) ── */}
      {!showFilters && <ActiveFilterBar filters={activeFilters} onClearAll={clearAllFilters} />}

      {/* ── Filter Modal ──────────────────────────────── */}
      {(() => {
        const filterContent = (
          <View style={styles.filterModalOverlay}>
            <TouchableOpacity style={styles.filterModalBackdrop} activeOpacity={1} onPress={() => setShowFilters(false)} />
            <View style={styles.filterModalSheet}>
              {/* Handle bar */}
              <View style={styles.filterModalHandle} />

              {/* Header */}
              <View style={styles.filterModalHeader}>
                <Text style={styles.filterModalTitle}>Filters</Text>
                {activeFilterCount > 0 && (
                  <TouchableOpacity onPress={clearAllFilters} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.filterModalClear}>Clear All</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Status */}
              <View style={styles.filterCard}>
                <View style={styles.filterCardHeader}>
                  <AppIcon name="account-check-outline" size={15} color={colors.textSecondary} />
                  <Text style={styles.filterCardTitle}>Status</Text>
                </View>
                <View style={styles.chipRow}>
                  {STATUS_OPTIONS.map((opt) => {
                    const selected = statusFilter === opt.value;
                    return (
                      <TouchableOpacity key={opt.label} style={[styles.chip, selected && styles.chipSelected]} onPress={() => setStatusFilter(opt.value)} testID={`status-chip-${opt.label.toLowerCase()}`}>
                        {selected && (
                          <LinearGradient
                            colors={[gradient.start, gradient.end]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                          />
                        )}
                        {selected && <AppIcon name="check" size={14} color="#FFFFFF" />}
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Fee Status */}
              <View style={styles.filterCard}>
                <View style={styles.filterCardHeader}>
                  <AppIcon name="currency-inr" size={15} color={colors.textSecondary} />
                  <Text style={styles.filterCardTitle}>Fee Status</Text>
                </View>
                <View style={styles.chipRow}>
                  {FEE_OPTIONS.map((opt) => {
                    const selected = feeFilter === opt.value;
                    return (
                      <TouchableOpacity key={opt.label} style={[styles.chip, selected && styles.chipSelected]} onPress={() => setFeeFilter(opt.value)} testID={`fee-chip-${opt.label.toLowerCase()}`}>
                        {selected && (
                          <LinearGradient
                            colors={[gradient.start, gradient.end]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                          />
                        )}
                        {selected && <AppIcon name="check" size={14} color="#FFFFFF" />}
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Batch */}
              <View style={styles.filterCard}>
                <View style={styles.filterCardHeader}>
                  <AppIcon name="account-group-outline" size={15} color={colors.textSecondary} />
                  <Text style={styles.filterCardTitle}>Batch</Text>
                </View>
                <BatchFilterBar selectedBatchId={selectedBatchId} onChange={handleBatchChange} />
              </View>

              {/* Apply button */}
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

      {/* ── Content ───────────────────────────────────── */}
      {error && <InlineError message={error.message} onRetry={refetch} />}

      {loading && !refreshing ? (
        <View testID="skeleton-container" style={styles.skeletons}>
          <SkeletonTile />
          <SkeletonTile />
          <SkeletonTile />
        </View>
      ) : !loading && items.length === 0 ? (
        <EmptyState
          variant={activeFilterCount > 0 || debouncedSearch ? 'noResults' : 'empty'}
          icon={activeFilterCount > 0 || debouncedSearch ? undefined : 'account-search-outline'}
          message={activeFilterCount > 0 || debouncedSearch ? 'No matching students' : 'No students enrolled yet.'}
          subtitle={activeFilterCount > 0 || debouncedSearch ? undefined : 'There are currently no students in the system. Add new students to see them listed here.'}
        />
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
          ListHeaderComponent={<SubscriptionBanner />}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={styles.listContent}
          testID="students-list"
        />
      )}

      {/* ── FAB ───────────────────────────────────────── */}
      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          onPress={handleAdd}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          activeOpacity={0.85}
          style={styles.fabTouchable}
          accessibilityLabel="Add new student"
          accessibilityRole="button"
          testID="add-student-button"
        >
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="plus" size={28} color={colors.white} />
        </TouchableOpacity>
      </Animated.View>

      {lastActionMenuStudentRef.current && (
        <StudentActionMenu
          visible={!!actionMenuStudent}
          student={lastActionMenuStudentRef.current}
          onClose={() => setActionMenuStudent(null)}
          onEdit={() => {
            if (lastActionMenuStudentRef.current) {
              navigation.navigate('StudentForm', { mode: 'edit', student: lastActionMenuStudentRef.current });
            }
          }}
          onAssignBatch={() => {
            if (lastActionMenuStudentRef.current) {
              navigation.navigate('StudentForm', { mode: 'edit', student: lastActionMenuStudentRef.current });
            }
          }}
          onDeleted={refetch}
          onStatusChanged={refetch}
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.base,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 5,
    overflow: 'hidden',
  },
  chipSelected: {
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textMedium,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: fontWeights.semibold,
  },

  /* ── Content ───────────────────────────────────── */
  skeletons: {
    padding: spacing.base,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: 100,
  },
  footer: {
    paddingVertical: spacing.base,
    alignItems: 'center',
  },

  /* ── FAB ────────────────────────────────────────── */
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
  },
  fabTouchable: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
