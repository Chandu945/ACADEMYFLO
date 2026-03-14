import React, { useState, useCallback, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import { Input } from '../../components/ui/Input';
import { TextArea } from '../../components/ui/TextArea';
import { DatePickerInput } from '../../components/ui/DatePickerInput';
import { TimePickerInput } from '../../components/ui/TimePickerInput';
import { InlineError } from '../../components/ui/InlineError';
import type { EventType, TargetAudience } from '../../../domain/event/event.types';
import * as eventApi from '../../../infra/event/event-api';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

type EditRoute = RouteProp<MoreStackParamList, 'EditEvent'>;

const EVENT_TYPES: { label: string; value: EventType; icon: string }[] = [
  { label: 'Tournament', value: 'TOURNAMENT', icon: 'trophy-outline' },
  { label: 'Meeting', value: 'MEETING', icon: 'account-group-outline' },
  { label: 'Demo Class', value: 'DEMO_CLASS', icon: 'school-outline' },
  { label: 'Holiday', value: 'HOLIDAY', icon: 'palm-tree' },
  { label: 'Annual Day', value: 'ANNUAL_DAY', icon: 'party-popper' },
  { label: 'Training Camp', value: 'TRAINING_CAMP', icon: 'whistle-outline' },
  { label: 'Other', value: 'OTHER', icon: 'dots-horizontal' },
];

const AUDIENCES: { label: string; value: TargetAudience; icon: string }[] = [
  { label: 'All', value: 'ALL', icon: 'account-multiple-outline' },
  { label: 'Students', value: 'STUDENTS', icon: 'school-outline' },
  { label: 'Staff', value: 'STAFF', icon: 'badge-account-outline' },
  { label: 'Parents', value: 'PARENTS', icon: 'account-child-outline' },
];

export function EditEventScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { showToast } = useToast();
  const navigation = useNavigation();
  const route = useRoute<EditRoute>();
  const event = route.params?.event;

  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [eventType, setEventType] = useState<EventType | ''>(event?.eventType as EventType ?? '');
  const [startDate, setStartDate] = useState(event?.startDate ?? '');
  const [endDate, setEndDate] = useState(event?.endDate ?? '');
  const [startTime, setStartTime] = useState(event?.startTime ?? '');
  const [endTime, setEndTime] = useState(event?.endTime ?? '');
  const [isAllDay, setIsAllDay] = useState(event?.isAllDay ?? false);
  const [location, setLocation] = useState(event?.location ?? '');
  const [targetAudience, setTargetAudience] = useState<TargetAudience | ''>(
    event?.targetAudience as TargetAudience ?? '',
  );

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (!event?.id) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Event data unavailable</Text>
      </View>
    );
  }

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Event title is required');
      return;
    }
    if (!startDate.trim()) {
      Alert.alert('Validation', 'Start date is required');
      return;
    }

    setSubmitting(true);
    setServerError(null);

    const result = await eventApi.updateEvent(event.id, {
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
    });

    setSubmitting(false);

    if (result.ok) {
      showToast('Event updated');
      navigation.goBack();
    } else {
      setServerError(result.error.message);
    }
  }, [title, description, eventType, startDate, endDate, startTime, endTime, isAllDay, location, targetAudience, event.id, navigation, showToast]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {serverError && <InlineError message={serverError} />}

      {/* ── Event Details ─────────────────────────────── */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="calendar-star" size={20} color={colors.primary} />
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
              {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
              <Icon
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
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="calendar-clock" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Date & Time</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabelRow}>
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="hours-24" size={18} color={colors.textSecondary} />
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

        <DatePickerInput
          label="End Date (optional)"
          value={endDate}
          onChange={setEndDate}
          placeholder="Select end date"
          testID="input-endDate"
        />

        {!isAllDay && (
          <>
            <TimePickerInput
              label="Start Time *"
              value={startTime}
              onChange={setStartTime}
              placeholder="Select start time"
              testID="input-startTime"
            />
            <TimePickerInput
              label="End Time (optional)"
              value={endTime}
              onChange={setEndTime}
              placeholder="Select end time"
              testID="input-endTime"
            />
          </>
        )}
      </View>

      {/* ── Location & Audience ──────────────────────── */}
      <View style={styles.sectionHeader}>
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="map-marker-outline" size={20} color={colors.primary} />
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
              {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
              <Icon
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
          // @ts-expect-error react-native-vector-icons types incompatible with @types/react@19
          <Icon name="content-save-outline" size={20} color={colors.white} />
        )}
        <Text style={styles.saveButtonText}>
          {submitting ? 'Saving...' : 'Save Changes'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
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
