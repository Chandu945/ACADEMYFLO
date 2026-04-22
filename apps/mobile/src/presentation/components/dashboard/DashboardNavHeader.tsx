import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../ui/AppIcon';
import { InitialsAvatar } from '../ui/InitialsAvatar';
import type { OwnerTabParamList } from '../../navigation/OwnerTabs';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import { useAuth } from '../../context/AuthContext';
import { ProfileModal } from './ProfileModal';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<OwnerTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<MoreStackParamList>
>;

const AVATAR_SIZE = 38;

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function DashboardHeaderLeft() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, subscription, logout } = useAuth();
  const navigation = useNavigation<Nav>();
  const [profileVisible, setProfileVisible] = useState(false);

  const handleViewSubscription = useCallback(() => {
    navigation.navigate('More', { screen: 'Subscription' } as never);
  }, [navigation]);

  if (!user) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.leftContainer}
        onPress={() => setProfileVisible(true)}
        testID="profile-header-avatar"
        accessibilityLabel="Open profile"
        accessibilityRole="button"
      >
        <InitialsAvatar name={user.fullName} size={AVATAR_SIZE} variant="solid" />
        <View style={styles.textContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {user.fullName}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {user.role === 'OWNER' ? 'Academy Owner' : user.role}
          </Text>
        </View>
      </TouchableOpacity>

      <ProfileModal
        visible={profileVisible}
        user={user}
        subscription={subscription}
        onClose={() => setProfileVisible(false)}
        onViewSubscription={handleViewSubscription}
        onLogout={logout}
      />
    </>
  );
}

type ChipTone = 'primary' | 'warning' | 'danger';

function getSubscriptionTone(
  subscription: ReturnType<typeof useAuth>['subscription'],
): { tone: ChipTone; label: string; icon: string } | null {
  if (!subscription) return null;

  // Terminal / blocked states → danger.
  if (
    subscription.status === 'BLOCKED' ||
    subscription.status === 'DISABLED' ||
    !subscription.canAccessApp
  ) {
    return { tone: 'danger', label: 'Expired', icon: 'alert-circle-outline' };
  }

  const days = subscription.daysRemaining;
  const icon =
    subscription.status === 'TRIAL' ? 'clock-outline' : 'shield-check-outline';

  if (days <= 0) {
    return { tone: 'danger', label: 'Expired', icon: 'alert-circle-outline' };
  }
  if (days <= 7) {
    return { tone: 'warning', label: `${days}d left`, icon };
  }
  return { tone: 'primary', label: `${days}d left`, icon };
}

export function DashboardHeaderRight() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const { subscription, user } = useAuth();

  // Only owners carry a subscription — staff / parent see nothing here.
  if (user?.role !== 'OWNER') return null;

  const tone = useMemo(() => getSubscriptionTone(subscription), [subscription]);
  if (!tone) return null;

  const palette = (() => {
    switch (tone.tone) {
      case 'warning':
        return { bg: colors.warningBg, border: colors.warningBorder, fg: colors.warningText };
      case 'danger':
        return { bg: colors.dangerBg, border: colors.dangerBorder, fg: colors.dangerText };
      case 'primary':
      default:
        return { bg: colors.primarySoft, border: colors.primaryLight, fg: colors.primary };
    }
  })();

  const daysRemaining =
    subscription && subscription.canAccessApp && subscription.daysRemaining > 0
      ? subscription.daysRemaining
      : null;

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('More', { screen: 'Subscription' } as never)}
      style={[styles.subChip, { backgroundColor: palette.bg, borderColor: palette.border }]}
      testID="dashboard-subscription-chip"
      accessibilityLabel={`Subscription ${tone.label}`}
      accessibilityRole="button"
    >
      <View style={[styles.subChipIconTile, { backgroundColor: palette.border }]}>
        <AppIcon name={tone.icon} size={13} color={palette.fg} />
      </View>
      {daysRemaining !== null ? (
        <View style={styles.subChipText}>
          <Text style={[styles.subChipValue, { color: palette.fg }]}>{daysRemaining}</Text>
          <Text style={[styles.subChipUnit, { color: palette.fg }]}>
            {daysRemaining === 1 ? 'day' : 'days'}
          </Text>
        </View>
      ) : (
        <Text style={[styles.subChipValue, { color: palette.fg }]}>{tone.label}</Text>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  textContainer: {
    marginLeft: spacing.sm,
  },
  name: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  subChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: 4,
    paddingRight: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: spacing.base,
  },
  subChipIconTile: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subChipText: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  subChipValue: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.1,
  },
  subChipUnit: {
    fontSize: 10,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.3,
    textTransform: 'lowercase',
    opacity: 0.82,
  },
});
