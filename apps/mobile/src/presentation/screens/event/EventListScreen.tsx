import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  FlatList,
  TextInput,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Keyboard,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/ui/AppIcon';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import type { EventListItem, EventListFilters, EventStatus } from '../../../domain/event/event.types';
import * as eventApi from '../../../infra/event/event-api';
import { EventCard } from '../../components/event/EventCard';
import { InlineError } from '../../components/ui/InlineError';
import { spacing, fontSizes, fontWeights, radius, listDefaults } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentMonthIST } from '../../../domain/common/date-utils';

type Nav = NativeStackNavigationProp<MoreStackParamList, 'EventList'>;

function getCurrentMonth(): string {
  return getCurrentMonthIST();
}

const STATUS_FILTERS: { label: string; value: EventStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Upcoming', value: 'UPCOMING' },
  { label: 'Ongoing', value: 'ONGOING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export function EventListScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<EventStatus | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [month] = useState(getCurrentMonth);
  const mountedRef = useRef(true);

  const [searchActive, setSearchActive] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchText.trim().toLowerCase());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText]);

  const filters: EventListFilters = useMemo(() => ({
    month,
    status: statusFilter,
    search: debouncedSearch || undefined,
  }), [month, statusFilter, debouncedSearch]);

  const fetchEvents = useCallback(async (pageNum: number, append = false) => {
    if (!append) setLoading(true);
    setError(null);
    try {
      const result = await eventApi.listEvents(filters, pageNum);
      if (!mountedRef.current) return;
      if (result.ok) {
        const { data, pagination } = result.value;
        setItems((prev) => append ? [...prev, ...data] : data);
        setTotal(pagination.total);
        setPage(pageNum);
      } else {
        setError(result.error.message);
      }
    } catch (e) {
      if (__DEV__) console.error('[EventList] Fetch failed:', e);
      if (mountedRef.current) {
        setError('Something went wrong.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEvents(1);
    }, [fetchEvents]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchEvents(1);
    } catch {
      // Handled inside fetchEvents
    } finally {
      setRefreshing(false);
    }
  }, [fetchEvents]);

  const onEndReached = useCallback(() => {
    if (loadingMore || items.length >= total) return;
    setLoadingMore(true);
    fetchEvents(page + 1, true);
  }, [loadingMore, items.length, total, page, fetchEvents]);

  const handleEventPress = useCallback((event: EventListItem) => {
    navigation.navigate('EventDetail', { eventId: event.id });
  }, [navigation]);

  const handleAdd = useCallback(() => {
    navigation.navigate('AddEvent');
  }, [navigation]);

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

  // Client-side filter by title (fallback — primary search is now server-side via filters.search)
  const filteredItems = useMemo(() => {
    if (!debouncedSearch) return items;
    return items.filter((item) => item.title.toLowerCase().includes(debouncedSearch));
  }, [items, debouncedSearch]);

  const renderItem = useCallback(({ item }: { item: EventListItem }) => (
    <EventCard event={item} onPress={() => handleEventPress(item)} />
  ), [handleEventPress]);

  const keyExtractor = useCallback((item: EventListItem) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [loadingMore, colors, styles]);

  return (
    <View style={styles.screen}>
      {/* ── Navbar ─────────────────────────────────────── */}
      <View style={styles.navbar}>
        {searchActive ? (
          <View style={styles.searchBar}>
            <TouchableOpacity onPress={closeSearch} style={styles.navBtn} accessibilityLabel="Close search" accessibilityRole="button">

              <AppIcon name="arrow-left" size={22} color={colors.text} />
            </TouchableOpacity>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search events..."
              placeholderTextColor={colors.textDisabled}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
              testID="event-search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} style={styles.navBtn} accessibilityLabel="Clear search" accessibilityRole="button">

                <AppIcon name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.titleBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
              
              <AppIcon name="arrow-left" size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.titleWrap}>
              <Text style={styles.navTitle}>Events</Text>
              {statusFilter && (
                <Text style={styles.navSubtitle}>
                  {STATUS_FILTERS.find((f) => f.value === statusFilter)?.label}
                </Text>
              )}
            </View>
            <View style={styles.navActions}>
              <TouchableOpacity onPress={openSearch} style={styles.navBtn} testID="search-button" accessibilityLabel="Search" accessibilityRole="button">
                
                <AppIcon name="magnify" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowFilters((v) => !v)}
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
                {statusFilter !== undefined && !showFilters && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>1</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── Filter Panel ──────────────────────────────── */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.filterChipRow}>
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.label}
                style={[styles.filterChip, statusFilter === f.value && styles.filterChipActive]}
                onPress={() => setStatusFilter(f.value)}
                testID={`filter-${f.label}`}
              >
                <Text style={[styles.filterText, statusFilter === f.value && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {statusFilter !== undefined && (
            <TouchableOpacity style={styles.clearFilters} onPress={() => setStatusFilter(undefined)}>
              
              <AppIcon name="filter-remove-outline" size={16} color={colors.danger} />
              <Text style={styles.clearFiltersText}>Clear Filter</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Active filter pill (when panel closed) ── */}
      {!showFilters && statusFilter !== undefined && (
        <View style={styles.activeFilterBar}>
          <View style={styles.activeFilterPill}>
            
            <AppIcon name="filter-variant" size={14} color={colors.primary} />
            <Text style={styles.activeFilterText}>
              {STATUS_FILTERS.find((f) => f.value === statusFilter)?.label}
            </Text>
            <TouchableOpacity onPress={() => setStatusFilter(undefined)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              
              <AppIcon name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {error && <InlineError message={error} onRetry={() => fetchEvents(1)} />}

      {loading && !refreshing ? (
        <View style={styles.emptyContainer}>
          <SkeletonTile />
          <SkeletonTile />
          <SkeletonTile />
        </View>
      ) : !loading && filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            
            <AppIcon name="calendar-blank-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No events found</Text>
          <Text style={styles.emptySubtitle}>
            {debouncedSearch ? 'Try a different search term.' : 'Create your first event to get started.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          removeClippedSubviews
          windowSize={11}
          maxToRenderPerBatch={5}
          ListFooterComponent={renderFooter}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          contentContainerStyle={styles.listContent}
          testID="event-list"
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAdd}
        accessibilityLabel="Add new event"
        accessibilityRole="button"
        testID="add-event-fab"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
    backgroundColor: colors.surface,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  titleWrap: {
    flex: 1,
    marginLeft: spacing.xs,
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
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
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

  navBtnActive: {
    backgroundColor: colors.primarySoft,
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },

  /* ── Filter Panel ───────────────────────────────── */
  filterPanel: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  filterLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  filterTextActive: {
    color: colors.white,
  },
  clearFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  clearFiltersText: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    fontWeight: fontWeights.medium,
  },

  /* ── Active Filter Bar ──────────────────────────── */
  activeFilterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  activeFilterText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: fontWeights.medium,
  },

  /* ── Content ─────────────────────────────────────── */
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: listDefaults.contentPaddingBottom,
  },
  footer: {
    paddingVertical: spacing.base,
    alignItems: 'center',
  },

  /* ── Empty State ─────────────────────────────────── */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing['3xl'],
    paddingHorizontal: spacing['3xl'],
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  /* ── FAB ─────────────────────────────────────────── */
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: fontSizes['3xl'],
    color: colors.white,
    lineHeight: 28,
  },
});
