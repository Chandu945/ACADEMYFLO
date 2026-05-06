import React, { useState, useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import { EventFormScreen } from './EventFormScreen';
import { getEventDetail } from '../../../infra/event/event-api';
import type { EventDetail } from '../../../domain/event/event.types';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type EditRoute = RouteProp<MoreStackParamList, 'EditEvent'>;

/** Resolves the route params into a real EventDetail before mounting the
 *  form. On web URL refresh the route's `event` object gets toString'd to
 *  "[object Object]" — fall back to fetching by `eventId`. */
export function EditEventScreen() {
  const route = useRoute<EditRoute>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const paramEventRaw = route.params?.event as unknown;
  const paramEvent =
    paramEventRaw &&
    typeof paramEventRaw === 'object' &&
    !Array.isArray(paramEventRaw) &&
    typeof (paramEventRaw as { id?: unknown }).id === 'string'
      ? (paramEventRaw as EventDetail)
      : undefined;
  const eventId = route.params?.eventId ?? paramEvent?.id;

  const [fetched, setFetched] = useState<EventDetail | null>(null);
  const [resolving, setResolving] = useState(!paramEvent && !!eventId);

  useEffect(() => {
    if (paramEvent || !eventId) return;
    let cancelled = false;
    setResolving(true);
    getEventDetail(eventId)
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setFetched(r.value);
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paramEvent, eventId]);

  const event = paramEvent ?? fetched ?? undefined;

  if (resolving) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Loading event…</Text>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.title}>Couldn't load this event</Text>
        <Text style={styles.text}>Open the form again from the events list.</Text>
        <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <EventFormScreen mode="edit" event={event} />
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.md,
    },
    title: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      textAlign: 'center',
    },
    text: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    btn: {
      marginTop: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.full,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primaryLight,
    },
    btnText: {
      color: colors.primary,
      fontWeight: fontWeights.bold,
      fontSize: fontSizes.sm,
    },
  });
