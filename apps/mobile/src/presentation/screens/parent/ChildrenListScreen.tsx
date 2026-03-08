import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParentHomeStackParamList } from '../../navigation/ParentHomeStack';
import type { ChildSummary } from '../../../domain/parent/parent.types';
import { getMyChildrenUseCase } from '../../../application/parent/use-cases/get-my-children.usecase';
import { parentApi } from '../../../infra/parent/parent-api';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

type Nav = NativeStackNavigationProp<ParentHomeStackParamList, 'ChildrenList'>;

export function ChildrenListScreen() {
  const navigation = useNavigation<Nav>();
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const result = await getMyChildrenUseCase({ parentApi });
    if (result.ok) {
      setChildren(result.value);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const renderChild = useCallback(
    ({ item }: { item: ChildSummary }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('ChildDetail', {
            studentId: item.studentId,
            fullName: item.fullName,
          })
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.childName}>{item.fullName}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: item.status === 'ACTIVE' ? colors.success : colors.textDisabled },
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.feeText}>Monthly Fee: {'\u20B9'}{item.monthlyFee}</Text>
          {item.currentMonthAttendancePercent != null && (
            <View
              style={[
                styles.attendanceBadge,
                {
                  backgroundColor:
                    item.currentMonthAttendancePercent >= 75
                      ? colors.success
                      : item.currentMonthAttendancePercent >= 50
                        ? colors.warning
                        : colors.danger,
                },
              ]}
            >
              <Text style={styles.attendanceText}>
                {item.currentMonthAttendancePercent}%
              </Text>
            </View>
          )}
          {item.currentMonthAttendancePercent == null && (
            <View style={[styles.attendanceBadge, { backgroundColor: colors.textDisabled }]}>
              <Text style={styles.attendanceText}>--%</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    ),
    [navigation],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={children}
      keyExtractor={(item) => item.studentId}
      renderItem={renderChild}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>No children linked to your account</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  childName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusText: {
    color: '#fff',
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  attendanceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  attendanceText: {
    color: '#fff',
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  errorText: { color: colors.danger, fontSize: fontSizes.md },
  emptyText: { color: colors.textSecondary, fontSize: fontSizes.md },
});
