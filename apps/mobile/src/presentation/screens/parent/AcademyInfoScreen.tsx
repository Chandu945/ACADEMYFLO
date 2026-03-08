import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { getAcademyInfoUseCase } from '../../../application/parent/use-cases/get-academy-info.usecase';
import { parentApi } from '../../../infra/parent/parent-api';
import type { AcademyInfo } from '../../../domain/parent/parent.types';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

export function AcademyInfoScreen() {
  const [info, setInfo] = useState<AcademyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const result = await getAcademyInfoUseCase({ parentApi });
    if (result.ok) {
      setInfo(result.value);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text>Loading...</Text>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </Screen>
    );
  }

  if (!info) return null;

  const addressParts = [
    info.address.line1,
    info.address.line2,
    info.address.city,
    `${info.address.state} - ${info.address.pincode}`,
    info.address.country,
  ].filter(Boolean);

  return (
    <Screen>
      <Text style={styles.title}>Academy Info</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Academy Name</Text>
        <Text style={styles.value}>{info.academyName}</Text>

        <Text style={[styles.label, { marginTop: spacing.base }]}>Address</Text>
        <Text style={styles.value}>{addressParts.join('\n')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.danger, fontSize: fontSizes.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.medium,
    color: colors.text,
    lineHeight: 22,
  },
});
