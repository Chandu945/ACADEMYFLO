import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { AppIcon } from '../../components/ui/AppIcon';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StaffStackParamList } from '../../navigation/StaffStack';
import type { StaffListItem, StaffStatus } from '../../../domain/staff/staff.types';
import { useStaff } from '../../../application/staff/use-staff';
import { listStaff, setStaffStatus } from '../../../infra/staff/staff-api';
import { setStaffStatusUseCase } from '../../../application/staff/use-cases/set-staff-status.usecase';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmSheet } from '../../components/ui/ConfirmSheet';
import { StaffRow } from '../../components/staff/StaffRow';
import { SubscriptionBanner } from '../../components/dashboard/SubscriptionBanner';
import { spacing, listDefaults } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Nav = NativeStackNavigationProp<StaffStackParamList, 'StaffList'>;

const staffApiRef = { listStaff };
const statusApiRef = { setStaffStatus };

export function StaffListScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const { items, loading, loadingMore, error, refetch, fetchMore } = useStaff(staffApiRef);
  const [refreshing, setRefreshing] = useState(false);

  // Refresh list when screen comes back into focus (e.g. after add/edit)
  // Skip first focus — useStaff already loads on mount
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

  const [toggleTarget, setToggleTarget] = useState<StaffListItem | null>(null);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

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

  const handleToggleStatus = useCallback(async () => {
    if (!toggleTarget) return;
    setToggling(true);
    setToggleError(null);

    try {
      const newStatus: StaffStatus = toggleTarget.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const result = await setStaffStatusUseCase(
        { staffApi: statusApiRef },
        toggleTarget.id,
        newStatus,
      );

      if (result.ok) {
        setToggleTarget(null);
        refetch();
      } else {
        setToggleError(result.error.message);
      }
    } catch (e) {
      if (__DEV__) console.error('[StaffListScreen] Toggle status failed:', e);
      setToggleError('Something went wrong. Please try again.');
    } finally {
      setToggling(false);
    }
  }, [toggleTarget, refetch]);

  const handleRowPress = useCallback(
    (staff: StaffListItem) => {
      navigation.navigate('StaffForm', { mode: 'edit', staff });
    },
    [navigation],
  );

  const handleAdd = useCallback(() => {
    navigation.navigate('StaffForm', { mode: 'create' });
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: StaffListItem }) => (
      <StaffRow
        staff={item}
        onPress={() => handleRowPress(item)}
        onToggleStatus={() => setToggleTarget(item)}
      />
    ),
    [handleRowPress],
  );

  const keyExtractor = useCallback((item: StaffListItem) => item.id, []);

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
      {error && <InlineError message={error.message} onRetry={refetch} />}

      {loading && !refreshing ? (
        <View testID="skeleton-container" style={styles.skeletons}>
          <SkeletonTile />
          <SkeletonTile />
        </View>
      ) : !loading && items.length === 0 ? (
        <EmptyState message="No staff members" />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          contentContainerStyle={styles.listContent}
          testID="staff-list"
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAdd}
        accessibilityLabel="Add new staff member"
        accessibilityRole="button"
        testID="add-staff-fab"
      >
        <AppIcon name="plus" size={28} color={colors.white} />
      </TouchableOpacity>

      <ConfirmSheet
        visible={toggleTarget !== null}
        title={toggleTarget?.status === 'ACTIVE' ? 'Deactivate Staff' : 'Activate Staff'}
        message={
          toggleError
            ? toggleError
            : toggleTarget?.status === 'ACTIVE'
              ? `Deactivate ${toggleTarget?.fullName}? They will be logged out immediately.`
              : `Activate ${toggleTarget?.fullName}?`
        }
        confirmLabel={toggleTarget?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        confirmVariant={toggleTarget?.status === 'ACTIVE' ? 'danger' : 'primary'}
        onConfirm={handleToggleStatus}
        onCancel={() => {
          setToggleTarget(null);
          setToggleError(null);
        }}
        loading={toggling}
        testID="status-confirm"
      />
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    padding: spacing.base,
    paddingBottom: 0,
  },
  skeletons: {
    padding: spacing.base,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: listDefaults.contentPaddingBottom,
  },
  footer: {
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
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
});
