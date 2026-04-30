import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/ui/AppIcon';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import type { ParentHomeStackParamList } from '../../navigation/ParentHomeStack';
import type { ChildSummary } from '../../../domain/parent/parent.types';
import { getMyChildrenUseCase } from '../../../application/parent/use-cases/get-my-children.usecase';
import { parentApi } from '../../../infra/parent/parent-api';
import { useAuth } from '../../context/AuthContext';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, shadows, avatarColors, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { getGreeting, getInitials, formatCurrency } from '../../utils/format';
import { useTheme } from '../../context/ThemeContext';
import { EmptyState } from '../../components/ui/EmptyState';

type Nav = NativeStackNavigationProp<ParentHomeStackParamList, 'ChildrenList'>;

function getAvatarColor(index: number, isDark: boolean): string {
  const palette = isDark ? avatarColors.dark : avatarColors.light;
  return palette[index % palette.length]!;
}

function AttendanceRing({ percent }: { percent: number | null }) {
  const { colors } = useTheme();
  const rStyles = useMemo(() => makeRingStyles(colors), [colors]);
  const value = percent ?? 0;
  const color =
    value >= 75 ? colors.success : value >= 50 ? colors.warning : colors.danger;
  const label = percent != null ? `${percent}%` : '--';

  return (
    <View style={rStyles.container}>
      <View style={[rStyles.ring, { borderColor: colors.border }]}>
        <View
          style={[
            rStyles.fill,
            {
              borderColor: color,
              transform: [{ rotate: `${(value / 100) * 360}deg` }],
            },
          ]}
        />
        <View style={rStyles.inner}>
          <Text style={[rStyles.value, { color }]}>{label}</Text>
        </View>
      </View>
      <Text style={rStyles.label}>Attendance</Text>
    </View>
  );
}

const makeRingStyles = (colors: Colors) => StyleSheet.create({
  container: { alignItems: 'center' },
  ring: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  inner: { alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold },
  label: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
});

export function ChildrenListScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await getMyChildrenUseCase({ parentApi });
      if (!mountedRef.current) return;
      if (result.ok) {
        setChildren(result.value);
      } else {
        setError(result.error.message);
      }
    } catch (e) {
      if (__DEV__) console.error('[ChildrenListScreen] Load failed:', e);
      if (mountedRef.current) {
        setError('Failed to load children. Pull to retry.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } catch {
      // Handled inside load
    }
  }, [load]);

  const renderHeader = useCallback(
    () => (
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.parentName}>{user?.fullName ?? 'Parent'}</Text>
        </View>
        <View style={styles.headerBadge}>
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="account-child-outline" size={28} color="#FFFFFF" />
        </View>
      </View>
    ),
    [user, styles, colors],
  );

  const keyExtractor = useCallback((item: ChildSummary) => item.studentId, []);

  const renderChild = useCallback(
    ({ item, index }: { item: ChildSummary; index: number }) => (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('ChildDetail', {
            studentId: item.studentId,
            fullName: item.fullName,
          })
        }
      >
        <View style={styles.cardBody}>
          <InitialsAvatar name={item.fullName} size={56} style={styles.avatar} />
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.childName} numberOfLines={1}>
                {item.fullName}
              </Text>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      item.status === 'ACTIVE' ? colors.success : colors.textDisabled,
                  },
                ]}
              />
            </View>
            <View style={styles.detailRow}>
              
              <AppIcon name="currency-inr" size={14} color={colors.textSecondary} />
              <Text style={styles.feeText}>
                {formatCurrency(item.monthlyFee)}
                <Text style={styles.feeLabel}> / month</Text>
              </Text>
            </View>
          </View>
          <AttendanceRing percent={item.currentMonthAttendancePercent} />
        </View>
        <View style={styles.cardAction}>
          <Text style={styles.cardActionText}>View Details</Text>
          
          <AppIcon name="chevron-right" size={18} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    ),
    [navigation, styles, colors, isDark],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading children...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        
        <AppIcon name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <FlatList
      data={children}
      keyExtractor={keyExtractor}
      renderItem={renderChild}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
      }
      ListEmptyComponent={
        <EmptyState
          icon="account-child-outline"
          message="No Children Linked"
          subtitle="Ask your academy to link your child to this account"
        />
      }
    />
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  list: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  greeting: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
  },
  parentName: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginTop: 2,
  },
  headerBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    ...shadows.md,
    overflow: 'hidden',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  cardInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  childName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  feeText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  feeLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.normal,
    color: colors.textDisabled,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  cardActionText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSizes.md,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.base,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md,
  },
  retryText: {
    color: colors.text,
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.base,
  },
});
