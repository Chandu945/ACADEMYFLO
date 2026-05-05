import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StaffDashboardScreen } from '../screens/staff/StaffDashboardScreen';
import { StaffDashboardHeaderLeft, StaffDashboardHeaderRight } from '../components/dashboard/StaffDashboardNavHeader';
import { StudentsStack } from './StudentsStack';
import { AttendanceStack } from './AttendanceStack';
import { FeesStack } from './FeesStack';
import { MoreStack } from './MoreStack';
import { GlobalFAB } from '../components/global/GlobalFAB';
import { FABProvider } from '../context/FABContext';
import type { Colors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { makeTabScreenOptions } from './tab-options';
import { CustomTabBar } from './CustomTabBar';
import { hasAnyDirtyForm, discardAllDirtyForms } from './dirty-form-registry';
import { crossAlert } from '../utils/crossPlatformAlert';
import type { IconMap } from './CustomTabBar';

const TAB_ICONS: IconMap = {
  Dashboard: { active: 'view-grid', inactive: 'view-grid-outline' },
  Students: { active: 'account-multiple', inactive: 'account-multiple-outline' },
  Attendance: { active: 'calendar-check', inactive: 'calendar-check-outline' },
  Fees: { active: 'credit-card', inactive: 'credit-card-outline' },
  More: 'apps',
};

// See OwnerTabs.tsx for why this is a hardcoded map rather than a read of
// the parent's nested-stack snapshot.
const TAB_ROOTS: Record<string, string> = {
  Students: 'StudentsList',
  Attendance: 'AttendanceMain',
  Fees: 'FeesHome',
  More: 'MoreHome',
};

export type StaffTabParamList = {
  Dashboard: undefined;
  Students: undefined;
  Attendance: undefined;
  Fees: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<StaffTabParamList>();

function StaffTabsInner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      {/* @ts-expect-error @types/react version mismatch in monorepo */}
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} iconMap={TAB_ICONS} />}
        screenOptions={makeTabScreenOptions(colors, insets.bottom)}
        screenListeners={({ navigation }) => ({
          tabPress: (e) => {
            const targetName = (e.target ?? '').split('-')[0];
            if (!targetName) return;
            const rootRouteName = TAB_ROOTS[targetName];

            // Dirty-form path — see OwnerTabs.tsx for the full rationale.
            if (hasAnyDirtyForm()) {
              e.preventDefault();
              crossAlert(
                'Discard changes?',
                'You have unsaved changes. Are you sure you want to leave?',
                [
                  { text: 'Stay', style: 'cancel' },
                  {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: () => {
                      discardAllDirtyForms();
                      navigation.dispatch(
                        CommonActions.navigate({
                          name: targetName,
                          ...(rootRouteName ? { params: { screen: rootRouteName } } : {}),
                        }),
                      );
                    },
                  },
                ],
              );
              return;
            }

            if (!rootRouteName) return; // single-screen tab
            e.preventDefault();
            navigation.dispatch(
              CommonActions.navigate({
                name: targetName,
                params: { screen: rootRouteName },
              }),
            );
          },
        })}
      >
        <Tab.Screen
          name="Dashboard"
          component={StaffDashboardScreen}
          options={{
            headerTitle: () => <StaffDashboardHeaderLeft />,
            headerRight: () => <StaffDashboardHeaderRight />,
            headerTitleAlign: 'left',
          }}
        />
        <Tab.Screen name="Students" component={StudentsStack} options={{ headerShown: false }} />
        <Tab.Screen name="Attendance" component={AttendanceStack} options={{ headerShown: false }} />
        <Tab.Screen name="Fees" component={FeesStack} options={{ headerShown: false }} />
        <Tab.Screen name="More" component={MoreStack} options={{ headerShown: false }} />
      </Tab.Navigator>
      <GlobalFAB />
    </View>
  );
}

export function StaffTabs() {
  return (
    <FABProvider>
      <StaffTabsInner />
    </FABProvider>
  );
}

const makeStyles = (_colors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
});
