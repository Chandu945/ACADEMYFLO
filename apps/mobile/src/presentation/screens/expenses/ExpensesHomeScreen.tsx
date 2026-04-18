import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { crossAlert } from '../../utils/crossPlatformAlert';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/ui/AppIcon';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import type { ExpenseItem, ExpenseCategory } from '../../../domain/expense/expense.types';
import { useExpenses } from '../../../application/expense/use-expenses';
import { getExpenseSummaryUseCase } from '../../../application/expense/use-cases/get-expense-summary.usecase';
import { deleteExpenseUseCase } from '../../../application/expense/use-cases/delete-expense.usecase';
import * as expenseApi from '../../../infra/expense/expense-api';
import { expenseCategoryListSchema } from '../../../domain/expense/expense.schemas';
import { InlineError } from '../../components/ui/InlineError';
import { ActiveFilterBar } from '../../components/ui/ActiveFilterBar';
import type { ActiveFilter } from '../../components/ui/ActiveFilterBar';
import { spacing, fontSizes, fontWeights, radius, shadows, listDefaults } from '../../theme';
import type { Colors } from '../../theme';
import type { ExpenseSummary } from '../../../domain/expense/expense.types';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentMonthIST } from '../../../domain/common/date-utils';

type Nav = NativeStackNavigationProp<MoreStackParamList, 'ExpensesHome'>;

/* ── Helpers ──────────────────────────────────────────────── */

function formatMonth(month: string): string {
  const [y, m] = month.split('-');
  const names = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${names[parseInt(m!, 10) - 1]} ${y}`;
}

function shortMonth(month: string): string {
  const [y, m] = month.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[parseInt(m!, 10) - 1]} ${y}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1 + delta, 1);
  const ny = d.getFullYear();
  const nm = String(d.getMonth() + 1).padStart(2, '0');
  return `${ny}-${nm}`;
}

function currentMonth(): string {
  return getCurrentMonthIST();
}

function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN')}`;
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [, m, d] = parts;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = parseInt(d!, 10);
  return `${day} ${months[parseInt(m!, 10) - 1]}`;
}

/** Map common expense category names to MaterialCommunityIcons */
function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('salary') || lower.includes('salaries')) return 'account-cash-outline';
  if (lower.includes('rent')) return 'home-outline';
  if (lower.includes('transport')) return 'bus';
  if (lower.includes('equipment') || lower.includes('supplies')) return 'hammer-wrench';
  if (lower.includes('utilit')) return 'lightning-bolt-outline';
  if (lower.includes('water')) return 'water-outline';
  if (lower.includes('electric')) return 'flash-outline';
  if (lower.includes('food') || lower.includes('meal')) return 'food-outline';
  if (lower.includes('repair') || lower.includes('maintenance')) return 'wrench-outline';
  if (lower.includes('marketing') || lower.includes('advertis')) return 'bullhorn-outline';
  if (lower.includes('insurance')) return 'shield-check-outline';
  if (lower.includes('internet') || lower.includes('wifi')) return 'wifi';
  if (lower.includes('phone') || lower.includes('mobile')) return 'phone-outline';
  if (lower.includes('office')) return 'office-building-outline';
  if (lower.includes('travel')) return 'airplane-outline';
  if (lower.includes('tax')) return 'file-document-outline';
  if (lower.includes('miscellan')) return 'dots-horizontal-circle-outline';
  return 'cash';
}

/** Pick a stable accent color for a category name */
const CATEGORY_COLORS_LIGHT = ['#0891b2', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#2563eb', '#d97706', '#0d9488'];
const CATEGORY_COLORS_DARK = ['#22d3ee', '#a78bfa', '#f472b6', '#fb923c', '#4ade80', '#60a5fa', '#fbbf24', '#2dd4bf'];

function getCategoryColor(name: string, isDark: boolean): string {
  const pool = isDark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS_LIGHT;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return pool[Math.abs(hash) % pool.length]!;
}

export function ExpensesHomeScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const [month, setMonth] = useState(currentMonth());
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const stableApi = expenseApi;

  const [showFilters, setShowFilters] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  const toggleFilters = useCallback(() => setShowFilters((v) => !v), []);
  const clearCategoryFilter = useCallback(() => setCategoryFilter(undefined), []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchText.trim().toLowerCase());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText]);

  // Dynamic categories
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const loadCategories = useCallback(async () => {
    try {
      const result = await expenseApi.listCategories();
      if (result.ok) {
        const parsed = expenseCategoryListSchema.safeParse(result.value);
        if (parsed.success) {
          setCategories(parsed.data.categories);
        }
      }
    } catch (e) {
      if (__DEV__) console.error('[ExpensesHomeScreen] Load categories failed:', e);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const { items, loading, loadingMore, error, hasMore, refetch, fetchMore } = useExpenses(
    month,
    stableApi,
    categoryFilter,
    debouncedSearch || undefined,
  );

  // Summary
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const mountedRef = useRef(true);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const result = await getExpenseSummaryUseCase({ expenseApi: stableApi }, month);
      if (!mountedRef.current) return;
      if (result.ok) {
        setSummary(result.value);
      }
    } catch (e) {
      if (__DEV__) console.error('[ExpensesHomeScreen] Load summary failed:', e);
    } finally {
      if (mountedRef.current) setSummaryLoading(false);
    }
  }, [month, stableApi]);

  useEffect(() => {
    mountedRef.current = true;
    loadSummary();
    return () => {
      mountedRef.current = false;
    };
  }, [loadSummary]);

  // Refresh when returning from add/edit expense
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refetch();
      loadSummary();
    }, [refetch, loadSummary]),
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), loadSummary(), loadCategories()]);
    } catch {
      // Errors handled by individual loaders
    } finally {
      setRefreshing(false);
    }
  }, [refetch, loadSummary, loadCategories]);

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

  // Client-side filter by category name or notes (fallback — primary search is now server-side)
  const filteredItems = useMemo(() => {
    if (!debouncedSearch) return items;
    return items.filter(
      (item) =>
        item.categoryName.toLowerCase().includes(debouncedSearch) ||
        (item.notes && item.notes.toLowerCase().includes(debouncedSearch)),
    );
  }, [items, debouncedSearch]);

  const selectedCategoryName = useMemo(() => {
    if (!categoryFilter) return null;
    return categories.find((c) => c.id === categoryFilter)?.name ?? null;
  }, [categoryFilter, categories]);

  const activeFilters: ActiveFilter[] = useMemo(() => {
    if (!selectedCategoryName) return [];
    return [{ key: 'category', label: 'Category', value: selectedCategoryName, onRemove: clearCategoryFilter }];
  }, [selectedCategoryName, clearCategoryFilter]);

  const handleDelete = useCallback((item: ExpenseItem) => {
    crossAlert(
      'Delete Expense',
      `Delete ${item.categoryName} - ${formatCurrency(item.amount)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteExpenseUseCase({ expenseApi: stableApi }, item.id);
              if (result.ok) {
                refetch();
                loadSummary();
              }
            } catch (e) {
              if (__DEV__) console.error('[ExpensesHomeScreen] Delete failed:', e);
            }
          },
        },
      ],
    );
  }, [stableApi, refetch, loadSummary]);

  const keyExtractor = useCallback((item: ExpenseItem) => item.id, []);

  const renderItem = useCallback(({ item }: { item: ExpenseItem }) => {
    const catColor = getCategoryColor(item.categoryName, isDark);
    const catIcon = getCategoryIcon(item.categoryName);
    return (
      <TouchableOpacity
        style={styles.expenseCard}
        onPress={() => navigation.navigate('ExpenseForm', { mode: 'edit', expense: item })}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
        testID={`expense-item-${item.id}`}
      >
        <View style={styles.cardBody}>
          <View style={[styles.iconCircle, { backgroundColor: catColor + '18' }]}>

            <AppIcon name={catIcon} size={20} color={catColor} />
          </View>
          <View style={styles.cardMiddle}>
            <Text style={styles.categoryLabel} numberOfLines={1}>{item.categoryName}</Text>
            <View style={styles.cardMeta}>

              <AppIcon name="calendar-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.dateLabel}>{formatDate(item.date)}</Text>
            </View>
            {item.notes ? (
              <Text style={styles.notesLabel} numberOfLines={1}>{item.notes}</Text>
            ) : null}
          </View>
          <Text style={styles.amountLabel}>{formatCurrency(item.amount)}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [isDark, colors, styles, handleDelete, navigation]);

  // Compute max category amount for progress bars
  const maxCatAmount = useMemo(() => {
    if (!summary) return 1;
    return Math.max(...summary.categories.map((c) => c.total), 1);
  }, [summary]);

  const ListHeader = (
    <View>
      {/* Month Picker */}
      <View style={styles.monthPicker}>
        <TouchableOpacity
          onPress={() => setMonth(shiftMonth(month, -1))}
          style={styles.monthBtn}
          testID="prev-month"
        >
          
          <AppIcon name="chevron-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.monthCenter}>
          <Text style={styles.monthLabel}>{formatMonth(month)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setMonth(shiftMonth(month, 1))}
          style={styles.monthBtn}
          testID="next-month"
        >
          
          <AppIcon name="chevron-right" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      {summary && !summaryLoading && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIconCircle}>
              
              <AppIcon name="wallet-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.summaryTitle}>Monthly Summary</Text>
          </View>
          <Text style={styles.summaryTotal}>{formatCurrency(summary.totalAmount)}</Text>
          <Text style={styles.summarySubtitle}>{shortMonth(month)} total expenses</Text>

          {summary.categories.length > 0 && (
            <View style={styles.summaryDivider} />
          )}

          {summary.categories.map((cat) => {
            const catColor = getCategoryColor(cat.category, isDark);
            const barWidth = Math.round((cat.total / maxCatAmount) * 100);
            return (
              <View key={cat.category} style={styles.summaryCatRow}>
                <View style={styles.summaryCatLeft}>
                  <View style={[styles.summaryCatDot, { backgroundColor: catColor }]} />
                  <Text style={styles.summaryCatLabel} numberOfLines={1}>{cat.category}</Text>
                </View>
                <Text style={styles.summaryCatAmount}>{formatCurrency(cat.total)}</Text>
                <View style={styles.summaryCatBarBg}>
                  <View style={[styles.summaryCatBarFill, { width: `${barWidth}%`, backgroundColor: catColor }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {error && <InlineError message={error.message} onRetry={refetch} />}
    </View>
  );

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
              placeholder="Search expenses..."
              placeholderTextColor={colors.textDisabled}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
              autoFocus
              testID="expense-search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} style={styles.navBtn} accessibilityLabel="Clear search text" accessibilityRole="button">
                
                <AppIcon name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.titleBar}>
            <TouchableOpacity onPress={() => navigation.navigate('MoreHome')} style={styles.navBtn} accessibilityLabel="Go back" accessibilityRole="button">
              
              <AppIcon name="arrow-left" size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.titleWrap}>
              <Text style={styles.navTitle}>Expenses</Text>
              <Text style={styles.navSubtitle}>{formatMonth(month)}</Text>
            </View>
            <View style={styles.navActions}>
              <TouchableOpacity onPress={openSearch} style={styles.navBtn} testID="search-button" accessibilityLabel="Search" accessibilityRole="button">
                
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
                {categoryFilter && !showFilters && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>1</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── Active Filter Pills (visible when panel closed) ── */}
      {!showFilters && <ActiveFilterBar filters={activeFilters} onClearAll={clearCategoryFilter} />}

      {/* ── Filter Panel ──────────────────────────────── */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <View style={styles.filterPanelHeader}>
            
            <AppIcon name="tag-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.filterPanelTitle}>Category</Text>
          </View>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, !categoryFilter && styles.filterChipActive]}
              onPress={() => setCategoryFilter(undefined)}
            >
              <Text style={[styles.filterChipText, !categoryFilter && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.filterChip, categoryFilter === cat.id && styles.filterChipActive]}
                onPress={() => setCategoryFilter(categoryFilter === cat.id ? undefined : cat.id)}
              >
                
                <AppIcon
                  name={getCategoryIcon(cat.name)}
                  size={14}
                  color={categoryFilter === cat.id ? colors.white : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    categoryFilter === cat.id && styles.filterChipTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {categoryFilter && (
            <TouchableOpacity style={styles.clearFilters} onPress={clearCategoryFilter}>
              
              <AppIcon name="filter-remove-outline" size={16} color={colors.danger} />
              <Text style={styles.clearFiltersText}>Clear Filter</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                
                <AppIcon name="cash-remove" size={48} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No expenses found</Text>
              <Text style={styles.emptySubtitle}>
                {debouncedSearch ? 'Try a different search term.' : 'Add your first expense to get started.'}
              </Text>
            </View>
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
        contentContainerStyle={styles.listContent}
        testID="expenses-list"
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ExpenseForm', { mode: 'create' })}
        accessibilityLabel="Add new expense"
        accessibilityRole="button"
        testID="add-expense-fab"
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

  /* ── Content ─────────────────────────────────────── */
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: listDefaults.contentPaddingBottom,
  },

  /* ── Month Picker ────────────────────────────────── */
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  monthBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSubtle,
  },
  monthCenter: {
    flex: 1,
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },

  /* ── Summary Card ────────────────────────────────── */
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  summaryTotal: {
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  summaryCatRow: {
    marginBottom: spacing.md,
  },
  summaryCatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  summaryCatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryCatLabel: {
    fontSize: fontSizes.base,
    color: colors.text,
    flex: 1,
  },
  summaryCatAmount: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: 4,
    textAlign: 'right',
  },
  summaryCatBarBg: {
    height: 4,
    backgroundColor: colors.bgSubtle,
    borderRadius: 2,
    overflow: 'hidden',
  },
  summaryCatBarFill: {
    height: 4,
    borderRadius: 2,
  },

  /* ── Filter Panel ─────────────────────────────────── */
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
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  filterPanel: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  filterPanelTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  clearFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  clearFiltersText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.danger,
  },

  /* ── Expense Card ────────────────────────────────── */
  expenseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMiddle: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  amountLabel: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.danger,
  },
  notesLabel: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    marginTop: 2,
  },

  /* ── Empty State ─────────────────────────────────── */
  emptyContainer: {
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
  fabText: {
    fontSize: fontSizes['3xl'],
    color: colors.white,
    lineHeight: 28,
  },
});
