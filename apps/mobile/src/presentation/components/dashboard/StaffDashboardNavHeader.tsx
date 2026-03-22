import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../ui/AppIcon';
import type { StaffTabParamList } from '../../navigation/StaffTabs';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import { useAuth } from '../../context/AuthContext';
import { ProfileModal } from './ProfileModal';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<StaffTabParamList, 'Dashboard'>,
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

export function StaffDashboardHeaderLeft() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
        testID="staff-profile-header-avatar"
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
            Staff Member
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

export function StaffDashboardHeaderRight() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('More', { screen: 'MoreHome' } as never)}
      style={styles.settingsBtn}
      testID="staff-header-settings"
      accessibilityLabel="Settings"
      accessibilityRole="button"
    >
      
      <AppIcon name="cog-outline" size={22} color={colors.textLight} />
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
