import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { AppIcon } from '../../components/ui/AppIcon';
import { useAuth } from '../../context/AuthContext';
import { useAuditLogs } from '../../../application/audit/use-audit-logs';
import { auditApi } from '../../../infra/audit/audit-api';
import { AuditLogRow } from '../../components/audit/AuditLogRow';
import { AuditFiltersPanel } from '../../components/audit/AuditFilters';
import { ActiveFilterBar } from '../../components/ui/ActiveFilterBar';
import type { ActiveFilter } from '../../components/ui/ActiveFilterBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import type { AuditLogItem } from '../../../domain/audit/audit.types';
import { spacing, fontSizes, fontWeights, radius, shadows, listDefaults } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export function AuditLogsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  if (!isOwner) {
    return (
      <View style={styles.center} testID="audit-forbidden">
        
        <AppIcon name="shield-lock-outline" size={48} color={colors.danger} />
        <Text style={styles.forbiddenText}>Only the owner can view audit logs.</Text>
      </View>
    );
  }

  return <AuditLogsContent />;
}

function AuditLogsContent() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    filters,
    appliedFilters,
    setFilters,
    applyFilters,
    clearFilters,
    fetchMore,
    refetch,
  } = useAuditLogs(auditApi);

  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.action) count++;
    if (appliedFilters.entityType) count++;
    return count;
  }, [appliedFilters.action, appliedFilters.entityType]);

  const activeFilterPills: ActiveFilter[] = useMemo(() => {
    const pills: ActiveFilter[] = [];
    if (appliedFilters.action) {
      pills.push({
        key: 'action',
        label: 'Action',
        value: appliedFilters.action.replace(/_/g, ' '),
        onRemove: () => {
          const next = { ...filters, action: '' as const };
          setFilters(next);
          // Apply immediately
          clearFilters();
          setFilters(next);
        },
      });
    }
    if (appliedFilters.entityType) {
      pills.push({
        key: 'entity',
        label: 'Entity',
        value: appliedFilters.entityType.replace(/_/g, ' '),
        onRemove: () => {
          const next = { ...filters, entityType: '' as const };
          setFilters(next);
          clearFilters();
          setFilters(next);
        },
      });
    }
    return pills;
  }, [appliedFilters, filters, setFilters, clearFilters]);

  const toggleFilters = useCallback(() => {
    setShowFilters((v) => !v);
  }, []);

  const handleApply = useCallback(() => {
    applyFilters();
    setShowFilters(false);
  }, [applyFilters]);

  const handleClear = useCallback(() => {
    clearFilters();
    setShowFilters(false);
  }, [clearFilters]);

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

  const renderItem = useCallback(
    ({ item }: { item: AuditLogItem }) => (
      <AuditLogRow item={item} testID={`audit-row-${item.id}`} />
    ),
    [],
  );

  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footer} testID="loading-more">
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    if (hasMore && items.length > 0) {
      return (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={fetchMore} testID="load-more-btn">
          
          <AppIcon name="chevron-down-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      );
    }
    return null;
  }, [loadingMore, hasMore, items.length, fetchMore, colors, styles]);

  return (
    <View style={styles.screen} testID="audit-logs-screen">
      {/* ── Navbar row with filter icon ───────────────── */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navBtn, showFilters && styles.navBtnActive]}
          onPress={toggleFilters}
          testID="toggle-filters"
          accessibilityRole="button"
          accessibilityLabel="Toggle filters"
        >
          
          <AppIcon
            name={showFilters ? 'filter-off-outline' : 'filter-variant'}
            size={22}
            color={showFilters ? colors.primary : colors.textSecondary}
          />
          {activeFilterCount > 0 && !showFilters && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Active filter pills (when panel is closed) ── */}
      {!showFilters && activeFilterPills.length > 0 && (
        <ActiveFilterBar filters={activeFilterPills} onClearAll={handleClear} />
      )}

      {/* ── Collapsible filter panel ─────────────────── */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <AuditFiltersPanel
            filters={filters}
            onChange={setFilters}
            onApply={handleApply}
            onClear={handleClear}
          />
        </View>
      )}

      {/* ── Error state ──────────────────────────────── */}
      {error && (
        <View style={styles.errorCard} testID="audit-error">
          <View style={styles.errorIconCircle}>
            
            <AppIcon name="alert-circle-outline" size={20} color={colors.danger} />
          </View>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refetch} testID="audit-retry">
            
            <AppIcon name="refresh" size={16} color={colors.primary} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Loading skeleton ─────────────────────────── */}
      {loading && !refreshing ? (
        <View style={styles.skeletonContainer} testID="audit-loading">
          <SkeletonTile />
          <SkeletonTile />
          <SkeletonTile />
          <SkeletonTile />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            items.length > 0 ? (
              <View style={styles.listSectionHeader}>
                
                <AppIcon name="clipboard-text-clock-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.listSectionTitle}>Activity Log</Text>
                <Text style={styles.listSectionCount}>{items.length}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState message="No audit logs found for the selected filters" />
          }
          ListFooterComponent={renderFooter}
          onEndReached={fetchMore}
          onEndReachedThreshold={0.3}
          testID="audit-list"
        />
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  navBtnActive: {
    backgroundColor: colors.primarySoft,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  filterPanel: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xs,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  forbiddenText: {
    fontSize: fontSizes.lg,
    color: colors.danger,
    textAlign: 'center',
    fontWeight: fontWeights.medium,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    ...shadows.sm,
  },
  errorIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.danger,
    fontWeight: fontWeights.medium,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  retryText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },
  skeletonContainer: {
    padding: spacing.base,
    gap: spacing.sm,
  },

  /* ── List Section Header ─────────────────────────── */
  listSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  listSectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    flex: 1,
  },
  listSectionCount: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },

  /* ── List Content ────────────────────────────────── */
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: listDefaults.contentPaddingBottomNoFab,
  },
  footer: {
    padding: spacing.base,
    alignItems: 'center',
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    marginTop: spacing.sm,
  },
  loadMoreText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
});
