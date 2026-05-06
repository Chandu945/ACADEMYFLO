import React, { memo, useMemo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import type { StaffListItem } from '../../../domain/staff/staff.types';
import { StaffStatusBadge } from './StaffStatusBadge';
import { AppCard } from '../ui/AppCard';
import { AppIcon } from '../ui/AppIcon';
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

function StaffRowComponent({ staff, onPress, onToggleStatus }: StaffRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isActive = staff.status === 'ACTIVE';
  const position = staff.qualificationInfo?.position?.trim();
  const ringColor = isActive ? colors.success : colors.borderStrong;

  return (
    <AppCard
      style={isActive ? styles.card : styles.cardInactive}
      onPress={onPress}
      testID={`staff-row-${staff.id}`}
    >
      <View style={[styles.avatarRing, { borderColor: ringColor }]}>
        {staff.profilePhotoUrl ? (
          <AvatarImage url={staff.profilePhotoUrl} style={styles.avatar} />
        ) : (
          <InitialsAvatar name={staff.fullName} size={44} variant="palette" />
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {staff.fullName}
          </Text>
          {!isActive && <StaffStatusBadge status={staff.status} />}
        </View>

        {position ? (
          <Text style={styles.position} numberOfLines={1}>
            {position}
          </Text>
        ) : null}

        {(staff.email || staff.phoneNumber) && (
          <View style={styles.contactRow}>
            {staff.phoneNumber ? (
              <View style={styles.contactItem}>
                <AppIcon name="phone-outline" size={11} color={colors.textDisabled} />
                <Text style={styles.contactText} numberOfLines={1}>
                  {staff.phoneNumber}
                </Text>
              </View>
            ) : null}
            {staff.email ? (
              <View style={styles.contactItem}>
                <AppIcon name="email-outline" size={11} color={colors.textDisabled} />
                <Text style={styles.contactText} numberOfLines={1} ellipsizeMode="middle">
                  {staff.email}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <Pressable
        style={[
          styles.actionBtn,
          isActive ? styles.actionBtnDanger : styles.actionBtnSuccess,
        ]}
        onPress={onToggleStatus}
        accessibilityRole="button"
        accessibilityLabel={`${isActive ? 'Deactivate' : 'Activate'} ${staff.fullName}`}
        testID={`toggle-status-${staff.id}`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <AppIcon
          name={isActive ? 'power' : 'power'}
          size={14}
          color={isActive ? colors.dangerText : colors.successText}
        />
        <Text
          style={[
            styles.actionText,
            { color: isActive ? colors.dangerText : colors.successText },
          ]}
        >
          {isActive ? 'Deactivate' : 'Activate'}
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
    marginBottom: spacing.xs + 2,
    gap: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  cardInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
    gap: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.borderStrong,
    opacity: 0.7,
  },
  avatarRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: 2,
  },
  name: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  position: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm + 2,
    rowGap: 2,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  contactText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  actionBtnDanger: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
  },
  actionBtnSuccess: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  actionText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.3,
  },
});
