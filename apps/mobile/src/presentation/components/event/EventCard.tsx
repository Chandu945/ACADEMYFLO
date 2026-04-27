import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { EventListItem } from '../../../domain/event/event.types';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  event: EventListItem;
  onPress: () => void;
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  TOURNAMENT: '#2563eb',
  MEETING: '#16a34a',
  DEMO_CLASS: '#ea580c',
  HOLIDAY: '#dc2626',
  ANNUAL_DAY: '#9333ea',
  TRAINING_CAMP: '#0891b2',
  OTHER: '#64748b',
};

function getStatusStyles(colors: Colors): Record<string, { bg: string; text: string }> {
  return {
    UPCOMING: { bg: colors.infoBg, text: colors.infoText },
    ONGOING: { bg: colors.successBg, text: colors.successText },
    // Was hardcoded #f1f5f9 (slate-100) which becomes white-on-white in
    // dark mode. Use theme tokens so the badge has contrast in both modes.
    COMPLETED: { bg: colors.border, text: colors.textSecondary },
    CANCELLED: { bg: colors.dangerBg, text: colors.dangerText },
  };
}

function formatTime(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h!, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function EventCardComponent({ event, onPress }: Props) {
  const { colors } = useTheme();
  const STATUS_STYLES = useMemo(() => getStatusStyles(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const accentColor = EVENT_TYPE_COLORS[event.eventType ?? 'OTHER'] ?? colors.textSecondary;
  const statusStyle = STATUS_STYLES[event.status] ?? STATUS_STYLES['UPCOMING']!;

  const timeDisplay = event.isAllDay
    ? 'All Day'
    : [formatTime(event.startTime), formatTime(event.endTime)].filter(Boolean).join(' - ');

  const dateDisplay = event.endDate && event.endDate !== event.startDate
    ? `${formatDateShort(event.startDate)} - ${formatDateShort(event.endDate)}`
    : formatDateShort(event.startDate);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`event-card-${event.id}`}
    >
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[
              styles.statusText,
              { color: statusStyle.text },
              event.status === 'CANCELLED' && styles.cancelled,
            ]}>
              {event.status}
            </Text>
          </View>
        </View>

        <Text style={styles.dateText}>{dateDisplay}</Text>

        {timeDisplay ? (
          <Text style={styles.timeText}>{timeDisplay}</Text>
        ) : null}

        {event.location ? (
          <Text style={styles.locationText} numberOfLines={1}>📍 {event.location}</Text>
        ) : null}

        {event.eventType ? (
          <View style={[styles.typeBadge, { backgroundColor: accentColor + '15' }]}>
            <Text style={[styles.typeText, { color: accentColor }]}>
              {event.eventType.replace(/_/g, ' ')}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export const EventCard = memo(EventCardComponent);

const makeStyles = (colors: Colors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  cancelled: {
    textDecorationLine: 'line-through',
  },
  dateText: {
    fontSize: fontSizes.sm,
    color: colors.textMedium,
    marginBottom: 2,
  },
  timeText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  locationText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  typeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
});
