import React, { memo, useMemo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import type { StaffListItem } from '../../../domain/staff/staff.types';
import { StaffStatusBadge } from './StaffStatusBadge';
import { AppCard } from '../ui/AppCard';
import { AvatarImage } from '../ui/AvatarImage';
import { InitialsAvatar } from '../ui/InitialsAvatar';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

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
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <AppCard style={styles.card} onPress={onPress} testID={`staff-row-${staff.id}`}>
      {staff.profilePhotoUrl ? (
        <AvatarImage url={staff.profilePhotoUrl} style={styles.avatar} />
      ) : (
        <InitialsAvatar
          name={staff.fullName}
          size={46}
          style={{ marginRight: spacing.md }}
        />
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
          <Text style={styles.phone} numberOfLines={1} ellipsizeMode="middle">
            {staff.phoneNumber}
          </Text>
        </View>
        {staff.qualificationInfo?.position ? (
          <Text style={styles.position} numberOfLines={1}>{staff.qualificationInfo.position}</Text>
        ) : null}
      </View>
      <Pressable
        style={[
          styles.toggleButton,
          staff.status === 'ACTIVE' ? styles.deactivateBtn : styles.activateBtn,
        ]}
        onPress={onToggleStatus}
        accessibilityRole="button"
        accessibilityLabel={`${staff.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${staff.fullName}`}
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

const makeStyles = (colors: Colors) => StyleSheet.create({
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
    // flexShrink lets the phone give up width to keep the Deactivate button on
    // its own; numberOfLines + ellipsizeMode='middle' truncates a too-long
    // international number while preserving the country-code prefix and the
    // last digits, both of which the user typically needs at a glance.
    flexShrink: 1,
    fontSize: fontSizes.sm,
    color: colors.textDisabled,
  },
  position: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontWeight: fontWeights.medium,
    marginTop: 2,
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
