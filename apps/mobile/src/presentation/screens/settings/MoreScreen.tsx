import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/ui/Screen';
import { colors, spacing, fontSizes, fontWeights, radius } from '../../theme';

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

const OWNER_STAFF_ITEMS: MenuItem[] = [
  { key: 'batches', icon: 'account-group-outline', label: 'Batches', screen: 'BatchesList' },
  { key: 'staff', icon: 'account-tie-outline', label: 'Staff', screen: 'StaffList', ownerOnly: true },
  { key: 'staff-attendance', icon: 'calendar-account-outline', label: 'Staff Attendance', screen: 'StaffAttendance', ownerOnly: true },
  { key: 'reports', icon: 'chart-bar', label: 'Reports', screen: 'ReportsHome', ownerOnly: true },
  { key: 'expenses', icon: 'calculator-variant-outline', label: 'Expenses', screen: 'ExpensesHome', ownerOnly: true },
  { key: 'enquiries', icon: 'account-question-outline', label: 'Enquiries', screen: 'EnquiryList' },
  { key: 'events', icon: 'calendar-plus', label: 'Events', screen: 'EventList' },
  { key: 'academy-settings', icon: 'cog-outline', label: 'Academy Settings', screen: 'AcademySettings' },
  { key: 'institute-info', icon: 'office-building-outline', label: 'Institute Information', screen: 'InstituteInfo', ownerOnly: true },
  { key: 'subscription', icon: 'card-account-details-outline', label: 'Subscription', screen: 'Subscription' },
  { key: 'audit-logs', icon: 'clipboard-text-clock-outline', label: 'Audit Logs', screen: 'AuditLogs', ownerOnly: true },
];

const PARENT_ITEMS: MenuItem[] = [
  { key: 'parent-profile', icon: 'account-outline', label: 'My Profile', screen: 'ParentProfile', parentOnly: true },
  { key: 'academy-info', icon: 'office-building-outline', label: 'Academy Info', screen: 'AcademyInfo', parentOnly: true },
  { key: 'payment-history', icon: 'history', label: 'Payment History', screen: 'PaymentHistory', parentOnly: true },
];

export function MoreScreen() {
  const navigation = useNavigation<Nav>();
  const { logout, user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const isParent = user?.role === 'PARENT';

  const menuItems = isParent
    ? PARENT_ITEMS
    : OWNER_STAFF_ITEMS.filter((item) => !item.ownerOnly || isOwner);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title} testID="more-title">
          More
        </Text>

        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen as any)}
            testID={`menu-${item.key}`}
          >
            <View style={styles.iconContainer}>
              {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
              <Icon name={item.icon} size={22} color={colors.primary} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="chevron-right" size={20} color={colors.textDisabled} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.menuItem, styles.logoutItem]}
          onPress={logout}
          testID="more-logout"
        >
          <View style={styles.iconContainer}>
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="logout" size={22} color={colors.danger} />
          </View>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  logoutItem: {
    marginTop: spacing.base,
  },
  logoutText: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.danger,
  },
});
