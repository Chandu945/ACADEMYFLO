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
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { getGreeting, formatCurrency } from '../../utils/format';
import { useTheme } from '../../context/ThemeContext';
import { EmptyState } from '../../components/ui/EmptyState';

type Nav = NativeStackNavigationProp<ParentHomeStackParamList, 'ChildrenList'>;

type AttendanceTone = 'success' | 'warning' | 'danger' | 'neutral';

function getAttendanceTone(percent: number | null): AttendanceTone {
  if (percent == null) return 'neutral';
  if (percent >= 90) return 'success';
  if (percent >= 75) return 'warning';
  return 'danger';
}

export function ChildrenListScreen() {
  const { colors } = useTheme();
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
    ({ item }: { item: ChildSummary }) => {
      const pct = item.currentMonthAttendancePercent;
      const tone = getAttendanceTone(pct);
      return (
        <TouchableOpacity
          style={[styles.card, styles[`cardStripe_${tone}`]]}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate('ChildDetail', {
              studentId: item.studentId,
              fullName: item.fullName,
            })
          }
        >
          <InitialsAvatar
            name={item.fullName}
            size={48}
            variant="palette"
            style={styles.avatar}
          />
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.childName} numberOfLines={1}>
                {item.fullName}
              </Text>
              {item.status !== 'ACTIVE' && (
                <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
              )}
            </View>
            <Text style={styles.feeText} numberOfLines={1}>
              {formatCurrency(item.monthlyFee)}
              <Text style={styles.feeLabel}> / month</Text>
            </Text>
          </View>
          <View style={styles.rightCol}>
            <View style={[styles.pctBadge, styles[`pctBadge_${tone}`]]}>
              <Text style={[styles.pctText, styles[`pctText_${tone}`]]}>
                {pct == null ? '—' : `${pct}%`}
              </Text>
            </View>
            <Text style={styles.pctLabel}>Attendance</Text>
          </View>
          <AppIcon name="chevron-right" size={18} color={colors.textDisabled} />
        </TouchableOpacity>
      );
    },
    [navigation, styles, colors],
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm + 2,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    ...shadows.sm,
  },
  cardStripe_success: { borderLeftColor: colors.success },
  cardStripe_warning: { borderLeftColor: colors.warning },
  cardStripe_danger: { borderLeftColor: colors.danger },
  cardStripe_neutral: { borderLeftColor: colors.border },
  avatar: {
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  childName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  feeText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  feeLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.normal,
    color: colors.textDisabled,
  },
  rightCol: {
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  pctBadge: {
    minWidth: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pctBadge_success: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  pctBadge_warning: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
  },
  pctBadge_danger: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
  },
  pctBadge_neutral: {
    backgroundColor: colors.bgSubtle,
    borderColor: colors.border,
  },
  pctText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.2,
  },
  pctText_success: { color: colors.successText },
  pctText_warning: { color: colors.warningText },
  pctText_danger: { color: colors.dangerText },
  pctText_neutral: { color: colors.textSecondary },
  pctLabel: {
    fontSize: 9,
    color: colors.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: fontWeights.semibold,
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
