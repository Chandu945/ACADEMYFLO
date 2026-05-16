import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { crossAlert } from '../../utils/crossPlatformAlert';
import { useNavigation, useFocusEffect, StackActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/ui/AppIcon';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import { consumePendingDeepLink } from '../../navigation/pending-deep-link';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { ThemeMode } from '../../context/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { ProfilePhotoUploader } from '../../components/common/ProfilePhotoUploader';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';

type Nav = NativeStackNavigationProp<MoreStackParamList, 'MoreHome'>;

type MenuItem = {
  key: string;
  icon: string;
  label: string;
  screen: keyof MoreStackParamList;
  danger?: boolean;
};

type MenuSection = { title: string; items: MenuItem[] };

/**
 * Single "Help & Support" menu row that navigates to SupportScreen. The
 * actual channels (email, call, WhatsApp) are listed on that screen — one
 * entry here keeps the More tab uncluttered while the dedicated screen
 * gives each channel breathing room.
 */
const SUPPORT_SECTION: MenuSection = {
  title: 'Help & Support',
  items: [
    {
      key: 'support',
      icon: 'headset',
      label: 'Contact Support',
      screen: 'Support',
    },
  ],
};

const OWNER_SECTIONS: MenuSection[] = [
  {
    title: 'Manage',
    items: [
      { key: 'batches', icon: 'account-group-outline', label: 'Batches', screen: 'BatchesList' },
      { key: 'staff', icon: 'account-tie-outline', label: 'Staff', screen: 'StaffList' },
      {
        key: 'enquiries',
        icon: 'account-question-outline',
        label: 'Enquiries',
        screen: 'EnquiryList',
      },
      { key: 'events', icon: 'calendar-plus', label: 'Events', screen: 'EventList' },
    ],
  },
  {
    title: 'Finance & Reports',
    items: [
      {
        key: 'expenses',
        icon: 'calculator-variant-outline',
        label: 'Expenses',
        screen: 'ExpensesHome',
      },
      { key: 'reports', icon: 'chart-bar', label: 'Reports', screen: 'ReportsHome' },
      {
        key: 'staff-attendance',
        icon: 'calendar-account-outline',
        label: 'Staff Attendance',
        screen: 'StaffAttendance',
      },
      {
        key: 'audit-logs',
        icon: 'clipboard-text-clock-outline',
        label: 'Audit Logs',
        screen: 'AuditLogs',
      },
      {
        key: 'overdue-students',
        icon: 'alert-circle-outline',
        label: 'Overdue Students',
        screen: 'OverdueStudents',
      },
      {
        key: 'parent-reviews',
        icon: 'message-star-outline',
        label: 'Parent Reviews',
        screen: 'AcademyReviews',
      },
    ],
  },
  {
    title: 'Settings',
    items: [
      {
        key: 'academy-settings',
        icon: 'cog-outline',
        label: 'Academy Settings',
        screen: 'AcademySettings',
      },
      {
        key: 'payment-methods',
        icon: 'qrcode',
        label: 'Payment Methods',
        screen: 'PaymentMethods',
      },
      {
        key: 'subscription',
        icon: 'card-account-details-outline',
        label: 'Subscription',
        screen: 'Subscription',
      },
      // BUG-040: explicit menu entry so owners can reach Change Password
      // even without first noticing the profile card is tappable. The
      // OwnerProfile screen also exposes the same destination — both paths
      // are intentional, mirroring the system-settings convention.
      {
        key: 'change-password',
        icon: 'key-outline',
        label: 'Change Password',
        screen: 'ChangePassword',
      },
    ],
  },
  SUPPORT_SECTION,
  {
    title: 'Account',
    items: [
      {
        key: 'delete-account',
        icon: 'trash-can-outline',
        label: 'Delete Account',
        screen: 'DeleteAccount',
      },
    ],
  },
];

const STAFF_SECTIONS: MenuSection[] = [
  {
    title: 'Manage',
    items: [
      { key: 'batches', icon: 'account-group-outline', label: 'Batches', screen: 'BatchesList' },
      {
        key: 'enquiries',
        icon: 'account-question-outline',
        label: 'Enquiries',
        screen: 'EnquiryList',
      },
      { key: 'events', icon: 'calendar-plus', label: 'Events', screen: 'EventList' },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        key: 'delete-account',
        icon: 'trash-can-outline',
        label: 'Delete Account',
        screen: 'DeleteAccount',
      },
    ],
  },
];

const PARENT_SECTIONS: MenuSection[] = [
  {
    title: 'Account',
    items: [
      {
        key: 'parent-profile',
        icon: 'account-outline',
        label: 'My Profile',
        screen: 'ParentProfile',
      },
      { key: 'academy-info', icon: 'school-outline', label: 'Academy Info', screen: 'AcademyInfo' },
      {
        key: 'payment-history',
        icon: 'history',
        label: 'Payment History',
        screen: 'PaymentHistory',
      },
      { key: 'rate-academy', icon: 'star-outline', label: 'Rate Academy', screen: 'RateAcademy' },
      {
        key: 'delete-account',
        icon: 'trash-can-outline',
        label: 'Delete Account',
        screen: 'DeleteAccount',
      },
    ],
  },
];

const THEME_OPTIONS: { key: ThemeMode; icon: string; label: string }[] = [
  { key: 'system', icon: 'cellphone-cog', label: 'System' },
  { key: 'light', icon: 'white-balance-sunny', label: 'Light' },
  { key: 'dark', icon: 'moon-waning-crescent', label: 'Dark' },
];

export function MoreScreen() {
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const { logout, user } = useAuth();
  const [photoUrl, setPhotoUrl] = useState<string | null>(user?.profilePhotoUrl ?? null);
  const isOwner = user?.role === 'OWNER';
  const isParent = user?.role === 'PARENT';

  const handleLogout = useCallback(() => {
    crossAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  }, [logout]);

  // Phase B: deep-link consumer. When a push notification (e.g.,
  // ENQUIRY_NEW) stages a chain targeting the More stack, NotificationContext
  // navigates to this tab; on focus we consume the chain and push each step
  // in order, building the back-stack incrementally — `[MoreHome →
  // EnquiryList → EnquiryDetail]` for an enquiry tap — so each screen's
  // back button works as designed.
  useFocusEffect(
    useCallback(() => {
      const pending = consumePendingDeepLink('More');
      if (!pending) return;
      for (const step of pending.chain) {
        navigation.dispatch(StackActions.push(step.screen, step.params));
      }
    }, [navigation]),
  );

  const sections = isParent ? PARENT_SECTIONS : isOwner ? OWNER_SECTIONS : STAFF_SECTIONS;

  return (
    <Screen scroll={false} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle} testID="more-title">
          More
        </Text>

        {/* Profile Card */}
        {user && (() => {
          // BUG-039: the profile card was a plain <View> with no tap handler,
          // so owners had no way to reach their editable profile screen even
          // though the backend supported it. Route owners to OwnerProfile,
          // parents to ParentProfile, and skip the tap for STAFF (their
          // profile editor doesn't exist yet — visual treatment also drops
          // the chevron so the affordance is honest).
          const profileScreen: keyof MoreStackParamList | null =
            user.role === 'OWNER'
              ? 'OwnerProfile'
              : user.role === 'PARENT'
                ? 'ParentProfile'
                : null;

          // ProfilePhotoUploader contains its own touch surface (tap to pick
          // a new photo). Nesting it inside a TouchableOpacity that also
          // navigates would steal those taps. We use a Pressable wrap on the
          // *info* section only; the avatar stays an independent touch target.
          const cardInner = (
            <View style={styles.profileCard} testID="profile-card">
              <View style={styles.profileAvatarWrap}>
                <ProfilePhotoUploader
                  currentPhotoUrl={photoUrl}
                  uploadPath="/api/v1/profile/photo"
                  onPhotoUploaded={(url) => setPhotoUrl(url)}
                  size={56}
                  testID="profile-photo"
                  fallbackName={user.fullName}
                />
              </View>
              <TouchableOpacity
                style={styles.profileInfo}
                onPress={() => profileScreen && navigation.navigate(profileScreen)}
                disabled={!profileScreen}
                activeOpacity={profileScreen ? 0.7 : 1}
                accessibilityRole={profileScreen ? 'button' : undefined}
                accessibilityLabel={profileScreen ? 'Edit profile' : undefined}
                testID="profile-card-tap"
              >
                <Text style={styles.profileName} numberOfLines={1}>
                  {user.fullName}
                </Text>
                <View style={styles.profileRoleBadge}>
                  <LinearGradient
                    colors={[gradient.start, gradient.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.profileRoleBadgeText}>{user.role}</Text>
                </View>
                <View style={styles.profileContactRow}>
                  <AppIcon name="email-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.profileContactText} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>
                <View style={styles.profileContactRow}>
                  <AppIcon name="phone-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.profileContactText}>{user.phoneNumber}</Text>
                </View>
              </TouchableOpacity>
              {profileScreen && (
                <View style={styles.profileChevron}>
                  <AppIcon name="chevron-right" size={20} color={colors.textDisabled} />
                </View>
              )}
            </View>
          );

          return cardInner;
        })()}

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.menuItem, idx < section.items.length - 1 && styles.menuItemBorder]}
                  onPress={() => navigation.navigate(item.screen as keyof MoreStackParamList)}
                  accessibilityLabel={item.label}
                  accessibilityRole="link"
                  testID={`menu-${item.key}`}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      item.danger && { backgroundColor: colors.dangerBg },
                    ]}
                  >
                    {!item.danger && (
                      <LinearGradient
                        colors={[gradient.start, gradient.end]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <AppIcon
                      name={item.icon}
                      size={20}
                      color={item.danger ? colors.danger : '#FFFFFF'}
                    />
                  </View>
                  <Text style={[styles.menuLabel, item.danger && { color: colors.danger }]}>
                    {item.label}
                  </Text>
                  <AppIcon name="chevron-right" size={18} color={colors.textDisabled} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.sectionCard}>
            {THEME_OPTIONS.map((opt, idx) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.menuItem, idx < THEME_OPTIONS.length - 1 && styles.menuItemBorder]}
                onPress={() => setMode(opt.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: mode === opt.key }}
                accessibilityLabel={`${opt.label} theme`}
                testID={`theme-${opt.key}`}
              >
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={[gradient.start, gradient.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <AppIcon name={opt.icon} size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.menuLabel}>{opt.label}</Text>
                {mode === opt.key && (
                  <AppIcon name="check" size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityLabel="Sign out"
          accessibilityRole="button"
          testID="more-logout"
        >
          <AppIcon name="logout" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      padding: spacing.lg,
    },
    screenTitle: {
      fontSize: fontSizes['3xl'],
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: spacing.lg,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      paddingVertical: spacing.base,
      paddingHorizontal: spacing.base,
      marginBottom: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.base,
    },
    profileAvatarWrap: {
      marginBottom: 0,
    },
    profileInfo: {
      flex: 1,
      minWidth: 0,
    },
    profileName: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      letterSpacing: -0.3,
    },
    profileRoleBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 3,
      borderRadius: radius.full,
      overflow: 'hidden',
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
    },
    profileRoleBadgeText: {
      fontSize: 10,
      fontWeight: fontWeights.bold,
      color: '#FFFFFF',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    profileContactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: 2,
    },
    profileContactText: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      flex: 1,
    },
    // BUG-039: chevron rendered only when the card is tappable (owner/parent).
    // For roles without a profile screen we hide it so the affordance matches
    // the actual behavior — no chevron, no implied "tap me".
    profileChevron: {
      paddingLeft: spacing.sm,
      alignSelf: 'center',
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.bold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      overflow: 'hidden',
      ...shadows.sm,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.base,
    },
    menuItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: radius.lg,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    menuLabel: {
      flex: 1,
      fontSize: fontSizes.base,
      fontWeight: fontWeights.medium,
      color: colors.text,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      marginTop: spacing.sm,
      backgroundColor: colors.dangerBg,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    logoutText: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.bold,
      color: colors.danger,
    },
    bottomSpacer: {
      height: spacing['2xl'],
    },
  });
