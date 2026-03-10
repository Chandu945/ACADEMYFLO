import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { EnquirySummary } from '../../../domain/enquiry/enquiry.types';
import { getEnquirySummaryUseCase } from '../../../application/enquiry/use-cases/get-enquiry-summary.usecase';
import * as enquiryApi from '../../../infra/enquiry/enquiry-api';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  onNavigate: (filter: string) => void;
};

export function EnquirySummaryWidget({ onNavigate }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [summary, setSummary] = useState<EnquirySummary | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    const result = await getEnquirySummaryUseCase({ enquiryApi });
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

  const tiles = [
    { key: 'ALL', label: 'Total', value: summary.total },
    { key: 'ACTIVE', label: 'Active', value: summary.active },
    { key: 'CLOSED', label: 'Closed', value: summary.closed },
    { key: 'TODAY', label: 'Today Follow Up', value: summary.todayFollowUp },
  ];

  return (
    <View style={styles.container} testID="enquiry-summary-widget">
      <Text style={styles.title}>Enquiry</Text>
      <View style={styles.row}>
        {tiles.map((tile) => (
          <TouchableOpacity
            key={tile.key}
            style={styles.tile}
            onPress={() => onNavigate(tile.key)}
            testID={`enquiry-${tile.key}`}
          >
            <Text style={[styles.tileValue, tile.value > 0 && styles.tileValueHighlight]}>
              {tile.value}
            </Text>
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
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
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tile: {
    flex: 1,
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
