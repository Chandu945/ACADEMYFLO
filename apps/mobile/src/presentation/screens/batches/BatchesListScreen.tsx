import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  TextInput,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { BatchesStackParamList } from '../../navigation/BatchesStack';
import type { BatchListItem } from '../../../domain/batch/batch.types';
import { useBatches } from '../../../application/batch/use-batches';
import { listBatches } from '../../../infra/batch/batch-api';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { BatchRow } from '../../components/batches/BatchRow';
import { spacing, fontSizes, fontWeights, radius, listDefaults } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Nav = NativeStackNavigationProp<BatchesStackParamList, 'BatchesList'>;

const batchesApi = { listBatches };

export function BatchesListScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const [refreshing, setRefreshing] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText]);

  const { items, loading, loadingMore, error, refetch, fetchMore } = useBatches(
    batchesApi,
    debouncedSearch || undefined,
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleRowPress = useCallback(
    (batch: BatchListItem) => {
      navigation.navigate('BatchDetail', { batch });
    },
    [navigation],
  );

  const handleAdd = useCallback(() => {
    navigation.navigate('BatchForm', { mode: 'create' });
  }, [navigation]);

  const openSearch = useCallback(() => {
    setSearchActive(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchActive(false);
    setSearchText('');
    setDebouncedSearch('');
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: BatchListItem }) => (
      <BatchRow batch={item} onPress={() => handleRowPress(item)} />
    ),
    [handleRowPress],
  );

  const keyExtractor = useCallback((item: BatchListItem) => item.id, []);

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
            <TouchableOpacity onPress={closeSearch} style={styles.navBtn}>
              {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
              <Icon name="arrow-left" size={22} color={colors.text} />
            </TouchableOpacity>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search batches..."
              placeholderTextColor={colors.textDisabled}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
              testID="batches-search-input"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} style={styles.navBtn}>
                {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                <Icon name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.titleBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
              {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
              <Icon name="arrow-left" size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.titleWrap}>
              <Text style={styles.navTitle}>Batches</Text>
            </View>
            <View style={styles.navActions}>
              <TouchableOpacity onPress={openSearch} style={styles.navBtn} testID="search-button" accessibilityLabel="Search" accessibilityRole="button">
                {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                <Icon name="magnify" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {error && <InlineError message={error.message} onRetry={refetch} />}

      {loading && !refreshing ? (
        <View testID="skeleton-container" style={styles.skeletons}>
          <SkeletonTile />
          <SkeletonTile />
          <SkeletonTile />
        </View>
      ) : !loading && items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="account-group-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No batches found</Text>
          <Text style={styles.emptySubtitle}>
            {debouncedSearch ? 'Try a different search term.' : 'Create your first batch to get started.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onEndReached={fetchMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          testID="batches-list"
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleAdd} testID="add-batch-button">
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

  /* ── Content ─────────────────────────────────────── */
  skeletons: {
    padding: spacing.base,
  },
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
