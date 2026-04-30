import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { crossAlert } from '../../utils/crossPlatformAlert';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import type { EventDetail as EventDetailType, EventStatus } from '../../../domain/event/event.types';
import { AppIcon } from '../../components/ui/AppIcon';
import * as eventApi from '../../../infra/event/event-api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type StatusVariant = 'info' | 'success' | 'neutral' | 'danger';

const STATUS_VARIANT: Record<string, StatusVariant> = {
  UPCOMING: 'info',
  ONGOING: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'danger',
};

type DetailRoute = RouteProp<MoreStackParamList, 'EventDetail'>;

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime12(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h!, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

type Nav = NativeStackNavigationProp<MoreStackParamList, 'EventDetail'>;

export function EventDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const eventId = route.params?.eventId ?? '';
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [event, setEvent] = useState<EventDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const mountedRef = useRef(true);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await eventApi.getEventDetail(eventId);
      if (!mountedRef.current) return;
      if (result.ok) {
        setEvent(result.value);
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      if (__DEV__) console.error('[EventDetailScreen] fetchDetail failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail]),
  );

  const handleStatusChange = useCallback((newStatus: EventStatus, label: string) => {
    crossAlert(
      label,
      `Are you sure you want to ${label.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setActionLoading(true);
            try {
              const result = await eventApi.changeEventStatus(eventId, newStatus);
              if (result.ok) {
                fetchDetail();
              } else {
                crossAlert('Error', result.error.message);
              }
            } catch (err) {
              if (__DEV__) console.error('[EventDetailScreen] handleStatusChange failed:', err);
              crossAlert('Error', 'Failed to update status. Please try again.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }, [eventId, fetchDetail]);

  const handleDelete = useCallback(() => {
    crossAlert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const result = await eventApi.deleteEvent(eventId);
              if (result.ok) {
                navigation.goBack();
              } else {
                crossAlert('Error', result.error.message);
              }
            } catch (err) {
              if (__DEV__) console.error('[EventDetailScreen] handleDelete failed:', err);
              crossAlert('Error', 'Failed to delete event. Please try again.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }, [eventId, navigation]);

  const handleEdit = useCallback(() => {
    if (!event) return;
    navigation.navigate('EditEvent', { event });
  }, [event, navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <InlineError message={error} onRetry={fetchDetail} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <EmptyState
          message="Event not found"
          subtitle="This event may have been removed or is no longer available."
          icon="calendar-remove-outline"
        />
      </View>
    );
  }

  const canEdit = isOwner || event.createdBy === user?.id;
  const showActions = event.status !== 'COMPLETED' && event.status !== 'CANCELLED';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIconTile}>
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="calendar-star" size={26} color="#FFFFFF" />
        </View>
        <Text style={styles.title} numberOfLines={3}>{event.title}</Text>
        <View style={styles.heroBadgeRow}>
          <Badge
            label={event.status}
            variant={STATUS_VARIANT[event.status] ?? 'neutral'}
            dot
            uppercase
          />
          {event.eventType && (
            <Badge label={event.eventType.replace(/_/g, ' ')} variant="neutral" uppercase />
          )}
        </View>
      </View>

      <View style={styles.infoSection}>
        <InfoRow
          icon="calendar-blank-outline"
          label="Date"
          value={
            event.endDate && event.endDate !== event.startDate
              ? `${formatFullDate(event.startDate)} - ${formatFullDate(event.endDate)}`
              : formatFullDate(event.startDate)
          }
        />
        <InfoRow
          icon="clock-outline"
          label="Time"
          value={
            event.isAllDay
              ? 'All Day'
              : [formatTime12(event.startTime), formatTime12(event.endTime)]
                  .filter(Boolean)
                  .join(' - ') || 'Not set'
          }
        />
        {event.location && <InfoRow icon="map-marker-outline" label="Location" value={event.location} />}
        {event.targetAudience && (
          <InfoRow icon="account-group-outline" label="Target Audience" value={event.targetAudience} isLast />
        )}
      </View>

      {event.description && (
        <View style={styles.descSection}>
          <View style={styles.sectionTitleRow}>
            <AppIcon name="text-box-outline" size={18} color={colors.text} />
            <Text style={styles.descTitle}>Description</Text>
          </View>
          <Text style={styles.descText}>{event.description}</Text>
        </View>
      )}

      {/* Photo Gallery */}
      <Pressable
        style={styles.galleryCard}
        onPress={() =>
          navigation.navigate('EventGallery', {
            eventId,
            eventTitle: event.title,
          })
        }
        accessibilityRole="button"
        accessibilityLabel="View photo gallery"
        testID="gallery-link"
      >
        <View style={styles.galleryIconCircle}>
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="image-multiple-outline" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.galleryInfo}>
          <Text style={styles.galleryTitle}>Photo Gallery</Text>
          <Text style={styles.gallerySubtitle}>
            {event.photoCount != null && event.photoCount > 0
              ? `${event.photoCount} photo${event.photoCount === 1 ? '' : 's'}`
              : 'Tap to view or add photos'}
          </Text>
        </View>
        <AppIcon name="chevron-right" size={22} color={colors.textSecondary} />
      </Pressable>

      {/* Action buttons */}
      <View style={styles.actions}>
        {canEdit && (
          <Button title="Edit" variant="primary" onPress={handleEdit} disabled={actionLoading} testID="edit-button" />
        )}

        {isOwner && showActions && (
          <>
            <View style={styles.actionGap} />
            <Button
              title="Mark as Completed"
              variant="secondary"
              onPress={() => handleStatusChange('COMPLETED', 'Mark as Completed')}
              loading={actionLoading}
              disabled={actionLoading}
              testID="complete-button"
            />
            <View style={styles.actionGap} />
            <Button
              title="Cancel Event"
              variant="secondary"
              onPress={() => handleStatusChange('CANCELLED', 'Cancel Event')}
              loading={actionLoading}
              disabled={actionLoading}
              testID="cancel-event-button"
            />
          </>
        )}

        {isOwner && event.status === 'CANCELLED' && (
          <>
            <View style={styles.actionGap} />
            <Button
              title="Reinstate Event"
              variant="secondary"
              onPress={() => handleStatusChange('UPCOMING', 'Reinstate Event')}
              loading={actionLoading}
              disabled={actionLoading}
              testID="reinstate-button"
            />
          </>
        )}

        {isOwner && (
          <>
            <View style={styles.actionGap} />
            <Button
              title="Delete Event"
              variant="danger"
              onPress={handleDelete}
              loading={actionLoading}
              disabled={actionLoading}
              testID="delete-button"
            />
          </>
        )}
      </View>

      <Text style={styles.meta}>
        Created {new Date(event.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </Text>
    </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, isLast }: { icon: string; label: string; value: string; isLast?: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <View style={styles.infoIconTile}>
        <AppIcon name={icon} size={16} color={colors.textSecondary} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.base,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  heroIconTile: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  infoSection: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIconTile: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    width: 110,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  infoValue: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    textAlign: 'right',
  },
  descSection: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  descTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  descText: {
    fontSize: fontSizes.base,
    color: colors.textMedium,
    lineHeight: 22,
  },
  galleryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  galleryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  galleryInfo: {
    flex: 1,
  },
  galleryTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  gallerySubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  meta: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    textAlign: 'center',
    marginTop: spacing.lg,
    letterSpacing: 0.3,
  },
  actions: {
    marginTop: spacing.md,
  },
  actionGap: {
    height: spacing.sm,
  },
});
