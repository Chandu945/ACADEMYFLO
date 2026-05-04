import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { Screen } from '../../components/ui/Screen';
import { AppIcon } from '../../components/ui/AppIcon';
import { RatingStars } from '../../components/review/RatingStars';
import { InlineError } from '../../components/ui/InlineError';
import { reviewApi } from '../../../infra/review/review-api';
import type { AcademyReview } from '../../../domain/review/review.types';
import { crossAlert } from '../../utils/crossPlatformAlert';
import { useToast } from '../../context/ToastContext';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { useTheme } from '../../context/ThemeContext';
import type { Colors } from '../../theme';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';

const MAX_COMMENT = 1000;

const RATING_HINT: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very good',
  5: 'Excellent',
};

export function RateAcademyScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const { showToast } = useToast();

  const [existing, setExisting] = useState<AcademyReview | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const mountedRef = useRef(true);
  const submittedRef = useRef(false);

  // Compare against the loaded review (no review = blank rating + empty comment).
  const initialRating = existing?.rating ?? 0;
  const initialComment = existing?.comment ?? '';
  const isDirty = !loading && (rating !== initialRating || comment !== initialComment);
  useUnsavedChangesWarning(isDirty && !submitting && !deleting && !submittedRef.current);

  const load = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const result = await reviewApi.getMyReview();
      if (!mountedRef.current) return;
      if (result.ok) {
        const review = result.value;
        setExisting(review);
        setRating(review?.rating ?? 0);
        setComment(review?.comment ?? '');
      } else {
        setLoadError(result.error.message);
      }
    } catch (e) {
      if (__DEV__) console.error('[RateAcademyScreen] load failed', e);
      if (mountedRef.current) setLoadError('Could not load your review.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const submit = useCallback(async () => {
    if (rating < 1) {
      showToast('Please pick a rating first', 'info');
      return;
    }
    setSubmitting(true);
    try {
      const result = await reviewApi.upsertMyReview({
        rating,
        comment: comment.trim() || null,
      });
      if (!mountedRef.current) return;
      if (result.ok) {
        setExisting(result.value);
        showToast(existing ? 'Review updated' : 'Thanks for your review!', 'success');
        submittedRef.current = true;
        navigation.goBack();
      } else {
        showToast(result.error.message, 'error');
      }
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }, [rating, comment, existing, navigation, showToast]);

  const confirmDelete = useCallback(() => {
    crossAlert('Delete review?', 'Your rating and comment will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            const result = await reviewApi.deleteMyReview();
            if (!mountedRef.current) return;
            if (result.ok) {
              setExisting(null);
              setRating(0);
              setComment('');
              showToast('Review deleted', 'success');
              submittedRef.current = true;
              navigation.goBack();
            } else {
              showToast(result.error.message, 'error');
            }
          } finally {
            if (mountedRef.current) setDeleting(false);
          }
        },
      },
    ]);
  }, [navigation, showToast]);

  if (loading) {
    return (
      <Screen edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen edges={['bottom']}>
        <InlineError message={loadError} onRetry={load} />
      </Screen>
    );
  }

  const hint = rating > 0 ? RATING_HINT[rating] ?? '' : 'Tap a star to rate';
  const isBusy = submitting || deleting;

  return (
    <Screen edges={['bottom']}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="star-outline" size={28} color="#FFFFFF" />
        </View>
        <Text style={styles.heroTitle}>
          {existing ? 'Your review' : 'Rate this academy'}
        </Text>
        <Text style={styles.heroSubtitle}>
          Your feedback is private and only shared with the academy owner.
        </Text>
      </View>

      {/* Rating */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>How would you rate your experience?</Text>
        <View style={styles.starsRow}>
          <RatingStars value={rating} onChange={setRating} size={36} />
        </View>
        <Text style={[styles.hintText, rating > 0 && styles.hintTextActive]}>{hint}</Text>
      </View>

      {/* Comment */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Add a comment (optional)</Text>
        <TextInput
          style={styles.commentInput}
          value={comment}
          onChangeText={setComment}
          placeholder="What went well? What could improve?"
          placeholderTextColor={colors.textDisabled}
          multiline
          maxLength={MAX_COMMENT}
          textAlignVertical="top"
        />
        <Text style={styles.count}>
          {comment.length}/{MAX_COMMENT}
        </Text>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, isBusy && styles.submitBtnDisabled]}
        activeOpacity={0.85}
        onPress={submit}
        disabled={isBusy}
      >
        <LinearGradient
          colors={[gradient.start, gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitBtnText}>
            {existing ? 'Update Review' : 'Submit Review'}
          </Text>
        )}
      </TouchableOpacity>

      {existing && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={confirmDelete}
          disabled={isBusy}
        >
          <AppIcon name="trash-can-outline" size={18} color={colors.danger} />
          <Text style={styles.deleteBtnText}>Delete Review</Text>
        </TouchableOpacity>
      )}
    </Screen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    hero: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
      marginBottom: spacing.base,
    },
    heroIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    heroTitle: {
      fontSize: fontSizes['2xl'],
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    heroSubtitle: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.base,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.base,
      marginBottom: spacing.md,
      ...shadows.sm,
    },
    cardLabel: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    starsRow: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
    },
    hintText: {
      marginTop: spacing.sm,
      fontSize: fontSizes.sm,
      color: colors.textDisabled,
      textAlign: 'center',
    },
    hintTextActive: {
      color: colors.textSecondary,
      fontWeight: fontWeights.medium,
    },
    commentInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      fontSize: fontSizes.md,
      color: colors.text,
      minHeight: 120,
    },
    count: {
      marginTop: spacing.xs,
      fontSize: fontSizes.xs,
      color: colors.textDisabled,
      textAlign: 'right',
    },
    submitBtn: {
      height: 52,
      borderRadius: radius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginTop: spacing.sm,
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnText: {
      color: '#FFFFFF',
      fontSize: fontSizes.md,
      fontWeight: fontWeights.bold,
      letterSpacing: 0.3,
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      marginTop: spacing.sm,
    },
    deleteBtnText: {
      color: colors.danger,
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
    },
  });
