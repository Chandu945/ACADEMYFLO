import React, { useState, useCallback } from 'react';
import { View, FlatList, RefreshControl, SafeAreaView, StyleSheet } from 'react-native';
import type { FeeDueItem } from '../../../domain/fees/fees.types';
import type { AppError } from '../../../domain/common/errors';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import { FeeDueRow } from '../../components/fees/FeeDueRow';
import { spacing, listDefaults } from '../../theme';

type PaidFeesScreenProps = {
  items: FeeDueItem[];
  loading: boolean;
  error: AppError | null;
  onRetry: () => void;
  onRowPress: (studentId: string) => void;
  studentNameMap: Record<string, string>;
};

export function PaidFeesScreen({
  items,
  loading,
  error,
  onRetry,
  onRowPress,
  studentNameMap,
}: PaidFeesScreenProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRetry();
    setRefreshing(false);
  }, [onRetry]);

  const renderItem = useCallback(
    ({ item }: { item: FeeDueItem }) => (
      <FeeDueRow
        item={item}
        onPress={() => onRowPress(item.studentId)}
        showStudentName
        studentName={studentNameMap[item.studentId]}
      />
    ),
    [onRowPress, studentNameMap],
  );

  const keyExtractor = useCallback((item: FeeDueItem) => item.id, []);

  if (loading) {
    return (
      <View style={styles.content}>
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.content}>
        <InlineError message={error.message} onRetry={onRetry} />
      </View>
    );
  }

  if (items.length === 0) {
    return <EmptyState message="No paid fees for this month" />;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      extraData={studentNameMap}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      testID="paid-list"
    />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.base,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: listDefaults.contentPaddingBottomNoFab,
  },
});
