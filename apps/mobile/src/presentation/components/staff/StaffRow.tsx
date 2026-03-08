import React, { memo } from 'react';
import { Pressable, View, Text, Image, StyleSheet } from 'react-native';
import type { StaffListItem } from '../../../domain/staff/staff.types';
import { StaffStatusBadge } from './StaffStatusBadge';
import { AppCard } from '../ui/AppCard';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

type StaffRowProps = {
  staff: StaffListItem;
  onPress: () => void;
  onToggleStatus: () => void;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

function StaffRowComponent({ staff, onPress, onToggleStatus }: StaffRowProps) {
  return (
    <AppCard style={styles.card} onPress={onPress} testID={`staff-row-${staff.id}`}>
      {staff.profilePhotoUrl ? (
        <Image source={{ uri: staff.profilePhotoUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{getInitials(staff.fullName)}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {staff.fullName}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {staff.email}
        </Text>
        <View style={styles.metaRow}>
          <StaffStatusBadge status={staff.status} />
          <Text style={styles.phone}>{staff.phoneNumber}</Text>
        </View>
      </View>
      <Pressable
        style={[
          styles.toggleButton,
          staff.status === 'ACTIVE' ? styles.deactivateBtn : styles.activateBtn,
        ]}
        onPress={onToggleStatus}
        testID={`toggle-status-${staff.id}`}
      >
        <Text style={styles.toggleText}>
          {staff.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        </Text>
      </Pressable>
    </AppCard>
  );
}

export const StaffRow = memo(StaffRowComponent);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textMedium,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  detail: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  phone: {
    fontSize: fontSizes.sm,
    color: colors.textDisabled,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.base,
    marginLeft: spacing.sm,
  },
  deactivateBtn: {
    backgroundColor: colors.dangerBg,
  },
  activateBtn: {
    backgroundColor: colors.successBg,
  },
  toggleText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textMedium,
  },
});
