import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { ThemeMode } from '../../context/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { ProfilePhotoUploader } from '../../components/common/ProfilePhotoUploader';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';

type Nav = NativeStackNavigationProp<MoreStackParamList, 'MoreHome'>;

type MenuItem = {
  key: string;
  icon: string;
  label: string;
  screen: keyof MoreStackParamList;
  ownerOnly?: boolean;
  staffVisible?: boolean;
  parentOnly?: boolean;
};

type MenuSection = { title: string; items: MenuItem[] };

const OWNER_SECTIONS: MenuSection[] = [
  {
    title: 'Manage',
    items: [
      { key: 'batches', icon: 'account-group-outline', label: 'Batches', screen: 'BatchesList' },
      { key: 'staff', icon: 'account-tie-outline', label: 'Staff', screen: 'StaffList', ownerOnly: true },
      { key: 'enquiries', icon: 'account-question-outline', label: 'Enquiries', screen: 'EnquiryList' },
      { key: 'events', icon: 'calendar-plus', label: 'Events', screen: 'EventList' },
    ],
  },
  {
    title: 'Finance & Reports',
    items: [
      { key: 'expenses', icon: 'calculator-variant-outline', label: 'Expenses', screen: 'ExpensesHome', ownerOnly: true },
      { key: 'reports', icon: 'chart-bar', label: 'Reports', screen: 'ReportsHome', ownerOnly: true },
      { key: 'staff-attendance', icon: 'calendar-account-outline', label: 'Staff Attendance', screen: 'StaffAttendance', ownerOnly: true },
      { key: 'audit-logs', icon: 'clipboard-text-clock-outline', label: 'Audit Logs', screen: 'AuditLogs', ownerOnly: true },
    ],
  },
  {
    title: 'Settings',
    items: [
      { key: 'academy-settings', icon: 'cog-outline', label: 'Academy Settings', screen: 'AcademySettings' },
      { key: 'institute-info', icon: 'office-building-outline', label: 'Institute Information', screen: 'InstituteInfo', ownerOnly: true },
      { key: 'subscription', icon: 'card-account-details-outline', label: 'Subscription', screen: 'Subscription' },
    ],
  },
];

const STAFF_SECTIONS: MenuSection[] = [
  {
    title: 'Manage',
    items: [
      { key: 'batches', icon: 'account-group-outline', label: 'Batches', screen: 'BatchesList' },
      { key: 'enquiries', icon: 'account-question-outline', label: 'Enquiries', screen: 'EnquiryList' },
      { key: 'events', icon: 'calendar-plus', label: 'Events', screen: 'EventList' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { key: 'academy-settings', icon: 'cog-outline', label: 'Academy Settings', screen: 'AcademySettings' },
      { key: 'subscription', icon: 'card-account-details-outline', label: 'Subscription', screen: 'Subscription' },
    ],
  },
];

const PARENT_SECTIONS: MenuSection[] = [
  {
    title: 'Account',
    items: [
      { key: 'parent-profile', icon: 'account-outline', label: 'My Profile', screen: 'ParentProfile', parentOnly: true },
      { key: 'academy-info', icon: 'school-outline', label: 'Academy Info', screen: 'AcademyInfo', parentOnly: true },
      { key: 'payment-history', icon: 'history', label: 'Payment History', screen: 'PaymentHistory', parentOnly: true },
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
  const isOwner = user?.role === 'OWNER';
  const isParent = user?.role === 'PARENT';

  const sections = isParent
    ? PARENT_SECTIONS
    : isOwner
      ? OWNER_SECTIONS
      : STAFF_SECTIONS;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle} testID="more-title">More</Text>

        {/* Profile Card */}
        {user && (
          <View style={styles.profileCard} testID="profile-card">
            <View style={styles.profileAvatarWrap}>
              <ProfilePhotoUploader
                currentPhotoUrl={user.profilePhotoUrl ?? null}
                uploadPath="/api/v1/profile/photo"
                onPhotoUploaded={() => {}}
                size={56}
                testID="profile-photo"
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>{user.fullName}</Text>
              <View style={styles.profileRoleBadge}>
                <Text style={styles.profileRoleBadgeText}>{user.role}</Text>
              </View>
              <View style={styles.profileContactRow}>
                {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                <Icon name="email-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.profileContactText} numberOfLines={1}>{user.email}</Text>
              </View>
              <View style={styles.profileContactRow}>
                {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                <Icon name="phone-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.profileContactText}>{user.phoneNumber}</Text>
              </View>
            </View>
          </View>
        )}

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.menuItem, idx < section.items.length - 1 && styles.menuItemBorder]}
                  onPress={() => navigation.navigate(item.screen as any)}
                  testID={`menu-${item.key}`}
                >
                  <View style={styles.iconContainer}>
                    {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                    <Icon name={item.icon} size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                  <Icon name="chevron-right" size={18} color={colors.textDisabled} />
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
                testID={`theme-${opt.key}`}
              >
                <View style={styles.iconContainer}>
                  {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                  <Icon name={opt.icon} size={20} color={colors.primary} />
                </View>
                <Text style={styles.menuLabel}>{opt.label}</Text>
                {mode === opt.key && (
                  // @ts-expect-error react-native-vector-icons types incompatible with @types/react@19
                  <Icon name="check" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => Alert.alert('Sign Out', 'Are you sure you want to sign out?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign Out', style: 'destructive', onPress: () => logout() }])}
          testID="more-logout"
        >
          {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
          <Icon name="logout" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
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
    padding: spacing.base,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  profileAvatarWrap: {
    marginRight: spacing.base,
    marginBottom: 0,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  profileRoleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  profileRoleBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.primary,
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
    backgroundColor: colors.primarySoft,
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
