import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { EventSummary } from '../../../domain/event/event.types';
import * as eventApi from '../../../infra/event/event-api';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  onNavigate: () => void;
};

export function EventSummaryWidget({ onNavigate }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [summary, setSummary] = useState<EventSummary | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    const result = await eventApi.getEventSummary();
    if (!mountedRef.current) return;
    if (result.ok) {
      setSummary(result.value);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  if (!summary) return null;

  const { total, upcoming } = summary.thisMonth;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onNavigate}
      testID="event-summary-widget"
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>📅</Text>
        <Text style={styles.title}>Events</Text>
        <Text style={styles.counter}>({upcoming}/{total})</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.tile}>
          <Text style={[styles.tileValue, upcoming > 0 && styles.tileValueHighlight]}>
            {upcoming}
          </Text>
          <Text style={styles.tileLabel}>Upcoming</Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileValue}>{total}</Text>
          <Text style={styles.tileLabel}>This Month</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.base,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  counter: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tile: {
    alignItems: 'center',
  },
  tileValue: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  tileValueHighlight: {
    color: colors.warning,
  },
  tileLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
