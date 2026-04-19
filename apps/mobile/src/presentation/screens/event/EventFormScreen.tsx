import React, { useState, useMemo, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { crossAlert } from '../../utils/crossPlatformAlert';
import { useNavigation } from '@react-navigation/native';
import { AppIcon } from '../../components/ui/AppIcon';
import { Input } from '../../components/ui/Input';
import { TextArea } from '../../components/ui/TextArea';
import { DatePickerInput } from '../../components/ui/DatePickerInput';
import { TimePickerInput } from '../../components/ui/TimePickerInput';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import type { EventType, TargetAudience, EventDetail } from '../../../domain/event/event.types';
import { isValidDate } from '../../../domain/common/date-utils';
import * as eventApi from '../../../infra/event/event-api';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';

/* ── Shared constants ─────────────────────────────────────── */

export const EVENT_TYPES: { label: string; value: EventType; icon: string }[] = [
  { label: 'Tournament', value: 'TOURNAMENT', icon: 'trophy-outline' },
  { label: 'Meeting', value: 'MEETING', icon: 'account-group-outline' },
  { label: 'Demo Class', value: 'DEMO_CLASS', icon: 'school-outline' },
  { label: 'Holiday', value: 'HOLIDAY', icon: 'palm-tree' },
  { label: 'Annual Day', value: 'ANNUAL_DAY', icon: 'party-popper' },
  { label: 'Training Camp', value: 'TRAINING_CAMP', icon: 'whistle-outline' },
  { label: 'Other', value: 'OTHER', icon: 'dots-horizontal' },
];

export const AUDIENCES: { label: string; value: TargetAudience; icon: string }[] = [
  { label: 'All', value: 'ALL', icon: 'account-multiple-outline' },
  { label: 'Students', value: 'STUDENTS', icon: 'school-outline' },
  { label: 'Staff', value: 'STAFF', icon: 'badge-account-outline' },
  { label: 'Parents', value: 'PARENTS', icon: 'account-child-outline' },
];

/* ── Props ────────────────────────────────────────────────── */

type EventFormScreenProps =
  | { mode: 'create' }
  | { mode: 'edit'; event?: EventDetail };

export function EventFormScreen(props: EventFormScreenProps) {
  const { mode } = props;
  const event = mode === 'edit' ? props.event : undefined;

  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { showToast } = useToast();
  const navigation = useNavigation();

  /* ── Form state (pre-filled for edit) ───────────────────── */
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [eventType, setEventType] = useState<EventType | ''>(
    (event?.eventType as EventType) ?? '',
  );
  const [startDate, setStartDate] = useState(event?.startDate ?? '');
  const [endDate, setEndDate] = useState(event?.endDate ?? '');
  const [startTime, setStartTime] = useState(event?.startTime ?? '');
  const [endTime, setEndTime] = useState(event?.endTime ?? '');
  const [isAllDay, setIsAllDay] = useState(event?.isAllDay ?? false);
  const [location, setLocation] = useState(event?.location ?? '');
  const [targetAudience, setTargetAudience] = useState<TargetAudience | ''>(
    (event?.targetAudience as TargetAudience) ?? '',
  );

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const submittedRef = useRef(false);

  /* ── Dirty detection ────────────────────────────────────── */
  const isDirty =
    mode === 'create'
      ? !!(
          title ||
          description ||
          eventType ||
          startDate ||
          endDate ||
          startTime ||
          endTime ||
          location ||
          targetAudience
        )
      : title !== (event?.title ?? '') ||
        description !== (event?.description ?? '') ||
        eventType !== ((event?.eventType as EventType) ?? '') ||
        startDate !== (event?.startDate ?? '') ||
        endDate !== (event?.endDate ?? '') ||
        startTime !== (event?.startTime ?? '') ||
        endTime !== (event?.endTime ?? '') ||
        isAllDay !== (event?.isAllDay ?? false) ||
        location !== (event?.location ?? '') ||
        targetAudience !== ((event?.targetAudience as TargetAudience) ?? '');

  useUnsavedChangesWarning(isDirty && !submitting && !submittedRef.current);

  /* ── Guard: missing event data in edit mode ─────────────── */
  if (mode === 'edit' && !event?.id) {
    return (
      <EmptyState
        icon="calendar-remove-outline"
        message="Event data unavailable"
        subtitle="The event could not be loaded. Please go back and try again."
      />
    );
  }

  /* ── Submit handler ─────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!title.trim()) {
      crossAlert('Validation', 'Event title is required');
      return;
    }
    if (!startDate.trim() || !isValidDate(startDate.trim())) {
      crossAlert('Validation', 'Enter a valid start date (YYYY-MM-DD)');
      return;
    }
    if (endDate.trim() && !isValidDate(endDate.trim())) {
      crossAlert('Validation', 'Enter a valid end date (YYYY-MM-DD)');
      return;
    }
    if (!isAllDay && !startTime.trim()) {
      crossAlert('Validation', 'Start time is required for non-all-day events');
      return;
    }
    if (startDate.trim() && endDate.trim() && endDate.trim() < startDate.trim()) {
      crossAlert('Validation', 'End date must be on or after start date');
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        eventType: eventType || undefined,
        startDate: startDate.trim(),
        endDate: endDate.trim() || undefined,
        startTime: isAllDay ? undefined : (startTime.trim() || undefined),
        endTime: isAllDay ? undefined : (endTime.trim() || undefined),
        isAllDay,
        location: location.trim() || undefined,
        targetAudience: targetAudience || undefined,
      };

      const result =
        mode === 'create'
          ? await eventApi.createEvent(payload)
          : await eventApi.updateEvent(event!.id, payload);

      if (result.ok) {
        submittedRef.current = true;
        showToast(mode === 'create' ? 'Event created' : 'Event updated');
        if (mode === 'edit' && event) {
          (navigation as any).replace('EventDetail', { eventId: event.id });
        } else {
          (navigation as any).navigate('EventList');
        }
        return;
      } else {
        setServerError(result.error.message);
      }
    } catch (e) {
      if (__DEV__) console.error('[EventForm] Save failed:', e);
      setServerError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const buttonLabel = mode === 'create' ? 'Save Event' : 'Save Changes';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {serverError && <InlineError message={serverError} />}

      {/* ── Event Details ─────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <AppIcon name="calendar-star" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Event Details</Text>
      </View>
      <View style={styles.card}>
        <Input
          label="Event Title *"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Annual Sports Day"
          maxLength={100}
          testID="input-title"
        />

        <Text style={styles.chipLabel}>EVENT TYPE</Text>
        <View style={styles.chipRow}>
          {EVENT_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.chip, eventType === t.value && styles.chipActive]}
              onPress={() => setEventType(eventType === t.value ? '' : t.value)}
              testID={`event-type-${t.value}`}
            >
              <AppIcon
                name={t.icon}
                size={14}
                color={eventType === t.value ? colors.white : colors.textSecondary}
              />
              <Text style={[styles.chipText, eventType === t.value && styles.chipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextArea
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Event details..."
          testID="input-description"
        />
      </View>

      {/* ── Date & Time ──────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <AppIcon name="calendar-clock" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Date & Time</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabelRow}>
            <AppIcon name="hours-24" size={18} color={colors.textSecondary} />
            <Text style={styles.switchLabel}>All Day Event</Text>
          </View>
          <Switch
            value={isAllDay}
            onValueChange={setIsAllDay}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={isAllDay ? colors.primary : colors.textDisabled}
            testID="switch-allDay"
          />
        </View>

        <DatePickerInput
          label="Start Date *"
          value={startDate}
          onChange={setStartDate}
          placeholder="Select start date"
          testID="input-startDate"
        />

        {!isAllDay && (
          <TimePickerInput
            label="Start Time *"
            value={startTime}
            onChange={setStartTime}
            placeholder="Select start time"
            testID="input-startTime"
          />
        )}

        <DatePickerInput
          label="End Date (optional)"
          value={endDate}
          onChange={setEndDate}
          placeholder="Select end date"
          testID="input-endDate"
        />

        {!isAllDay && (
          <TimePickerInput
            label="End Time (optional)"
            value={endTime}
            onChange={setEndTime}
            placeholder="Select end time"
            testID="input-endTime"
          />
        )}
      </View>

      {/* ── Location & Audience ──────────────────────── */}
      <View style={styles.sectionHeader}>
        <AppIcon name="map-marker-outline" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Location & Audience</Text>
      </View>
      <View style={styles.card}>
        <Input
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="Academy Ground, Hyderabad"
          maxLength={200}
          testID="input-location"
        />

        <Text style={styles.chipLabel}>TARGET AUDIENCE</Text>
        <View style={styles.chipRow}>
          {AUDIENCES.map((a) => (
            <TouchableOpacity
              key={a.value}
              style={[styles.chip, targetAudience === a.value && styles.chipActive]}
              onPress={() => setTargetAudience(targetAudience === a.value ? '' : a.value)}
              testID={`audience-${a.value}`}
            >
              <AppIcon
                name={a.icon}
                size={14}
                color={targetAudience === a.value ? colors.white : colors.textSecondary}
              />
              <Text style={[styles.chipText, targetAudience === a.value && styles.chipTextActive]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Save Button ──────────────────────────────── */}
      <TouchableOpacity
        style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        testID="submit-button"
      >
        {!submitting && (
          <AppIcon name="content-save-outline" size={20} color={colors.white} />
        )}
        <Text style={styles.saveButtonText}>
          {submitting ? 'Saving...' : buttonLabel}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      padding: spacing.base,
      paddingBottom: spacing['3xl'],
    },

    /* ── Section Header ─────────────────────────────── */
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    sectionTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },

    /* ── Card ────────────────────────────────────────── */
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.base,
      ...shadows.sm,
    },

    /* ── Chips ───────────────────────────────────────── */
    chipLabel: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.base,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: colors.white,
    },

    /* ── Switch ──────────────────────────────────────── */
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.base,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    switchLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    switchLabel: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.medium,
      color: colors.text,
    },

    /* ── Save Button ────────────────────────────────── */
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: radius.xl,
      padding: spacing.base,
      marginTop: spacing.xl,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.semibold,
      color: colors.white,
    },
  });
