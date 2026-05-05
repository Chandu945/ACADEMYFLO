import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import LinearGradient from 'react-native-linear-gradient';
import { spacing, radius, shadows, listDefaults, gradient } from '../../theme';
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

  // Defense-in-depth dedup: setToggling(true) is async, so a fast double-tap
  // on the confirm button can fire two PATCHes before the disabled state
  // propagates.
  const toggleInflightRef = useRef(false);
  const handleToggleStatus = useCallback(async () => {
    if (!toggleTarget) return;
    if (toggleInflightRef.current) return;
    toggleInflightRef.current = true;
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
        // Code-aware mapping so the user sees an actionable message instead
        // of the raw transport error.
        const code = result.error.code;
        let msg = result.error.message;
        if (code === 'FORBIDDEN') {
          msg = 'You do not have permission to change this staff member’s status.';
        } else if (code === 'NOT_FOUND') {
          msg = 'This staff member no longer exists. Please refresh.';
        } else if (code === 'NETWORK' || code === 'UNKNOWN') {
          msg = 'Could not reach the server. Check your connection and try again.';
        }
        setToggleError(msg);
      }
    } catch (e) {
      if (__DEV__) console.error('[StaffListScreen] Toggle status failed:', e);
      setToggleError('Something went wrong. Please try again.');
    } finally {
      toggleInflightRef.current = false;
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
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      {error && <InlineError message={error.message} onRetry={refetch} />}

      {loading && !refreshing ? (
        <View testID="skeleton-container" style={styles.skeletons}>
          <SkeletonTile />
          <SkeletonTile />
        </View>
      ) : !loading && items.length === 0 ? (
        <EmptyState
          icon="account-group-outline"
          message="No staff members"
          subtitle="Add your first staff member to get started."
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
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
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
    </SafeAreaView>
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
    // Matches the StudentsList FAB look — rounded square + primary glow.
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
