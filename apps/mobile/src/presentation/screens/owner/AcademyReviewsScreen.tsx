import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppIcon } from '../../components/ui/AppIcon';
import { RatingStars } from '../../components/review/RatingStars';
import { InlineError } from '../../components/ui/InlineError';
import { Screen } from '../../components/ui/Screen';
import { reviewApi } from '../../../infra/review/review-api';
import type {
  AcademyReview,
  AcademyReviewSummary,
} from '../../../domain/review/review.types';
import { useTheme } from '../../context/ThemeContext';
import type { Colors } from '../../theme';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import { getInitials } from '../../utils/format';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function AcademyReviewsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [summary, setSummary] = useState<AcademyReviewSummary | null>(null);
  const [reviews, setReviews] = useState<AcademyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [summaryRes, listRes] = await Promise.all([
        reviewApi.getOwnerReviewsSummary(),
        reviewApi.listOwnerReviews(),
      ]);
      if (!mountedRef.current) return;
      if (!summaryRes.ok) {
        setError(summaryRes.error.message);
        return;
      }
      if (!listRes.ok) {
        setError(listRes.error.message);
        return;
      }
      setSummary(summaryRes.value);
      setReviews(listRes.value);
    } catch (e) {
      if (__DEV__) console.error('[AcademyReviewsScreen] load failed', e);
      if (mountedRef.current) setError('Could not load reviews.');
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
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
  }, [load]);

  if (loading && !refreshing) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <InlineError message={error} onRetry={load} />
      </Screen>
    );
  }

  const maxBar = summary
    ? Math.max(
        summary.distribution['1'],
        summary.distribution['2'],
        summary.distribution['3'],
        summary.distribution['4'],
        summary.distribution['5'],
        1,
      )
    : 1;

  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryAverage}>
              {summary && summary.count > 0 ? summary.averageRating.toFixed(1) : '—'}
            </Text>
            <RatingStars
              value={summary ? Math.round(summary.averageRating) : 0}
              size={18}
            />
            <Text style={styles.summaryCount}>
              {summary?.count ?? 0} review{summary?.count === 1 ? '' : 's'}
            </Text>
          </View>

          <View style={styles.summaryRight}>
            {([5, 4, 3, 2, 1] as const).map((r) => {
              const count = summary?.distribution[String(r) as '1' | '2' | '3' | '4' | '5'] ?? 0;
              const pct = (count / maxBar) * 100;
              return (
                <View key={r} style={styles.distRow}>
                  <Text style={styles.distLabel}>{r}★</Text>
                  <View style={styles.distBarTrack}>
                    <View style={[styles.distBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.distCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Reviews list */}
        {reviews.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <LinearGradient
                colors={[gradient.start, gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <AppIcon name="message-star-outline" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.emptySubtitle}>
              When parents submit feedback it will appear here.
            </Text>
          </View>
        ) : (
          reviews.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(r.parentName)}</Text>
                </View>
                <View style={styles.reviewHeaderInfo}>
                  <Text style={styles.reviewName} numberOfLines={1}>
                    {r.parentName}
                  </Text>
                  <Text style={styles.reviewDate}>
                    {formatDate(r.updatedAt)}
                    {r.updatedAt !== r.createdAt ? ' · edited' : ''}
                  </Text>
                </View>
                <RatingStars value={r.rating} size={16} />
              </View>
              {r.comment ? (
                <Text style={styles.reviewComment}>{r.comment}</Text>
              ) : (
                <Text style={styles.reviewCommentEmpty}>No comment</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing['3xl'],
    },

    summaryCard: {
      flexDirection: 'row',
      gap: spacing.base,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      marginBottom: spacing.base,
      ...shadows.sm,
    },
    summaryLeft: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingRight: spacing.base,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    summaryAverage: {
      fontSize: 40,
      fontWeight: fontWeights.bold,
      color: colors.text,
      letterSpacing: -1.5,
    },
    summaryCount: {
      marginTop: spacing.xs,
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
    },
    summaryRight: {
      flex: 1,
      justifyContent: 'center',
    },
    distRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 2,
      gap: spacing.xs,
    },
    distLabel: {
      width: 22,
      fontSize: 11,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
    },
    distBarTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.bgSubtle,
      overflow: 'hidden',
    },
    distBarFill: {
      height: '100%',
      backgroundColor: '#F59E0B',
      borderRadius: 4,
    },
    distCount: {
      minWidth: 24,
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'right',
    },

    emptyCard: {
      alignItems: 'center',
      padding: spacing.xl,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      ...shadows.sm,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    emptyTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    emptySubtitle: {
      marginTop: spacing.xs,
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      textAlign: 'center',
    },

    reviewCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.base,
      marginBottom: spacing.sm,
      ...shadows.sm,
    },
    reviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.bgSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.bold,
      color: colors.textSecondary,
    },
    reviewHeaderInfo: {
      flex: 1,
      minWidth: 0,
    },
    reviewName: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    reviewDate: {
      marginTop: 2,
      fontSize: fontSizes.xs,
      color: colors.textDisabled,
    },
    reviewComment: {
      fontSize: fontSizes.sm,
      color: colors.text,
      lineHeight: 20,
    },
    reviewCommentEmpty: {
      fontSize: fontSizes.sm,
      color: colors.textDisabled,
      fontStyle: 'italic',
    },
  });
