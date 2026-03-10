import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { StaffStatus } from '../../../domain/staff/staff.types';
import { fontSizes, fontWeights, spacing } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type StaffStatusBadgeProps = {
  status: StaffStatus;
};

function getBadgeColors(colors: Colors): Record<StaffStatus, string> {
  return {
    ACTIVE: colors.success,
    INACTIVE: colors.warning,
  };
}

export function StaffStatusBadge({ status }: StaffStatusBadgeProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const BADGE_COLORS = useMemo(() => getBadgeColors(colors), [colors]);
  return (
    <View style={[styles.badge, { backgroundColor: BADGE_COLORS[status] }]}>
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  text: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.white,
  },
});
