import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { AppIcon } from '../../components/ui/AppIcon';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import type { EnquiryListItem, EnquiryStatus } from '../../../domain/enquiry/enquiry.types';
import { useEnquiries } from '../../../application/enquiry/use-enquiries';
import * as enquiryApi from '../../../infra/enquiry/enquiry-api';
import { getTodayIST } from '../../../domain/common/date-utils';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import { spacing, fontSizes, fontWeights, radius, shadows, listDefaults } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Nav = NativeStackNavigationProp<MoreStackParamList, 'EnquiryList'>;
type Route = RouteProp<MoreStackParamList, 'EnquiryList'>;

const FILTER_TABS: { key: string; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'CLOSED', label: 'Closed' },
  { key: 'TODAY', label: 'Today Follow Up' },
];

export function EnquiryListScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const initialFilter = route.params?.filter ?? 'ALL';
  const [activeTab, setActiveTab] = useState(initialFilter);
  const [showFilters, setShowFilters] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText]);

  const status: EnquiryStatus | undefined =
    activeTab === 'ACTIVE' ? 'ACTIVE' : activeTab === 'CLOSED' ? 'CLOSED' : undefined;
  const followUpToday = activeTab === 'TODAY';

  const stableApi = enquiryApi;
  const { items, loading, loadingMore, error, hasMore, refetch, fetchMore } = useEnquiries(
    stableApi,
    status,
    debouncedSearch || undefined,
    followUpToday || undefined,
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

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // Handled by hook
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

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

  const extractDate = useCallback((dateStr: string): string => {
    return dateStr.includes('T') ? dateStr.split('T')[0]! : dateStr;
  }, []);

  const isOverdue = useCallback((dateStr: string | null): boolean => {
    if (!dateStr) return false;
    return extractDate(dateStr) < getTodayIST();
  }, [extractDate]);

  const formatDate = useCallback((dateStr: string): string => {
    try {
      const dateOnly = extractDate(dateStr);
      const d = new Date(dateOnly + 'T00:00:00');
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN');
    } catch {
      return dateStr;
    }
  }, [extractDate]);

  const keyExtractor = useCallback((item: EnquiryListItem) => item.id, []);

  const renderItem = useCallback(({ item }: { item: EnquiryListItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('EnquiryDetail', { enquiryId: item.id })}
      testID={`enquiry-item-${item.id}`}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.prospectName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <Text style={styles.prospectName} numberOfLines={1}>{item.prospectName}</Text>
            <View style={[styles.statusBadge, item.status === 'ACTIVE' ? styles.activeBadge : styles.closedBadge]}>
              <Text style={[styles.statusText, item.status === 'ACTIVE' ? styles.activeText : styles.closedText]}>
                {item.status}
              </Text>
            </View>
          </View>
          <View style={styles.phoneRow}>
            
            <AppIcon name="phone-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.mobileNumber}>{item.mobileNumber}</Text>
          </View>
          {item.interestedIn && (
            <View style={styles.interestRow}>
              
              <AppIcon name="target" size={14} color={colors.textLight} />
              <Text style={styles.interestedIn}>{item.interestedIn}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardFooter}>
        {item.source && (
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceText}>{item.source.replace(/_/g, ' ')}</Text>
          </View>
        )}
        {item.nextFollowUpDate && (
          <View style={styles.followUpRow}>
            
            <AppIcon name="calendar-clock" size={14} color={isOverdue(item.nextFollowUpDate) ? colors.danger : colors.textSecondary} />
            <Text style={[styles.followUpDate, isOverdue(item.nextFollowUpDate) && styles.overdueText]}>
              {formatDate(item.nextFollowUpDate)}
              {isOverdue(item.nextFollowUpDate) ? ' (Overdue)' : ''}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  ), [styles, colors, navigation, isOverdue, formatDate]);

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
              placeholder="Search by name or phone..."
              placeholderTextColor={colors.textDisabled}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
              testID="enquiry-search"
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
              <Text style={styles.navTitle}>Enquiries</Text>
              {activeTab !== 'ALL' && (
                <Text style={styles.navSubtitle}>
                  {FILTER_TABS.find((t) => t.key === activeTab)?.label}
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
                {activeTab !== 'ALL' && !showFilters && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>1</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── Filter Modal ──────────────────────────────── */}
      {(() => {
        const filterContent = (
          <View style={styles.filterModalOverlay}>
            <TouchableOpacity style={styles.filterModalBackdrop} activeOpacity={1} onPress={() => setShowFilters(false)} />
            <View style={styles.filterModalSheet}>
              <View style={styles.filterModalHandle} />
              <View style={styles.filterModalHeader}>
                <Text style={styles.filterModalTitle}>Filters</Text>
                {activeTab !== 'ALL' && (
                  <TouchableOpacity onPress={() => setActiveTab('ALL')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.filterModalClear}>Clear All</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterChipRow}>
                {FILTER_TABS.map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.filterChip, activeTab === tab.key && styles.filterChipActive]}
                    onPress={() => setActiveTab(tab.key)}
                    testID={`filter-${tab.key}`}
                  >
                    <Text style={[styles.filterChipText, activeTab === tab.key && styles.filterChipTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.filterApplyBtn} onPress={() => setShowFilters(false)}>
                <Text style={styles.filterApplyText}>Show Results</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

        if (!showFilters) return null;
        if (Platform.OS === 'web') return filterContent;
        return <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>{filterContent}</Modal>;
      })()}

      {/* ── Active filter pill (when panel closed) ── */}
      {!showFilters && activeTab !== 'ALL' && (
        <View style={styles.activeFilterBar}>
          <View style={styles.activeFilterPill}>
            
            <AppIcon name="filter-variant" size={14} color={colors.primary} />
            <Text style={styles.activeFilterText}>
              {FILTER_TABS.find((t) => t.key === activeTab)?.label}
            </Text>
            <TouchableOpacity onPress={() => setActiveTab('ALL')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              
              <AppIcon name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {error && <InlineError message={error.message} onRetry={refetch} />}

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="account-question-outline"
              message="No enquiries found"
              subtitle={debouncedSearch ? 'Try a different search term.' : 'Create your first enquiry to get started.'}
              variant={debouncedSearch ? 'noResults' : 'empty'}
            />
          ) : null
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={styles.loader} /> : null
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        onEndReached={hasMore ? fetchMore : undefined}
        onEndReachedThreshold={0.3}
          removeClippedSubviews
          windowSize={11}
          maxToRenderPerBatch={5}
        testID="enquiry-list"
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEnquiry')}
        accessibilityLabel="Add new enquiry"
        accessibilityRole="button"
        testID="add-enquiry-fab"
      >
        <AppIcon name="plus" size={28} color={colors.white} />
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
    width: 44,
    height: 44,
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

  /* ── Filter Modal ───────────────────────────────── */
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
    backgroundColor: colors.primary,
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
  filterChipText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
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
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  avatarText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  cardInfo: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  prospectName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  activeBadge: {
    backgroundColor: colors.successBg,
  },
  closedBadge: {
    backgroundColor: colors.bgSubtle,
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
  activeText: {
    color: colors.successText,
  },
  closedText: {
    color: colors.textSecondary,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  mobileNumber: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  interestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 3,
  },
  interestedIn: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sourceBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  sourceText: {
    fontSize: fontSizes.xs,
    color: colors.primary,
    fontWeight: fontWeights.medium,
  },
  followUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  followUpDate: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  overdueText: {
    color: colors.danger,
    fontWeight: fontWeights.medium,
  },

  loader: {
    padding: spacing.base,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
