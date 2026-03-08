import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { OwnerTabParamList } from '../../navigation/OwnerTabs';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import { useAuth } from '../../context/AuthContext';
import { ProfileModal } from './ProfileModal';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

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
  const { user, subscription, logout } = useAuth();
  const navigation = useNavigation<Nav>();
  const [profileVisible, setProfileVisible] = useState(false);

  const handleViewSubscription = useCallback(() => {
    navigation.navigate('More', { screen: 'Subscription' } as never);
  }, [navigation]);

  if (!user) return null;

  const initials = getInitials(user.fullName);

  return (
    <>
      <TouchableOpacity
        style={styles.leftContainer}
        onPress={() => setProfileVisible(true)}
        testID="profile-header-avatar"
        accessibilityLabel="Open profile"
        accessibilityRole="button"
      >
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
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

export function DashboardHeaderRight() {
  const navigation = useNavigation<Nav>();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('More', { screen: 'MoreHome' } as never)}
      style={styles.settingsBtn}
      testID="profile-header-settings"
      accessibilityLabel="Settings"
      accessibilityRole="button"
    >
      {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
      <Icon name="cog-outline" size={22} color={colors.textLight} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.primary,
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
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
});
