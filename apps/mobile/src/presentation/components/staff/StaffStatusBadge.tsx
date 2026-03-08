import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { StaffStatus } from '../../../domain/staff/staff.types';
import { colors, fontSizes, fontWeights, spacing } from '../../theme';

type StaffStatusBadgeProps = {
  status: StaffStatus;
};

const BADGE_COLORS: Record<StaffStatus, string> = {
  ACTIVE: colors.success,
  INACTIVE: colors.warning,
};

export function StaffStatusBadge({ status }: StaffStatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: BADGE_COLORS[status] }]}>
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
