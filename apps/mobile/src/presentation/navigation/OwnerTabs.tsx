import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { StackActions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardScreen } from '../screens/owner/DashboardScreen';
import { DashboardHeaderLeft, DashboardHeaderRight } from '../components/dashboard/DashboardNavHeader';
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

const TAB_ICONS: Record<string, string> = {
  Dashboard: 'view-grid-outline',
  Students: 'account-multiple-outline',
  Attendance: 'check',
  Fees: 'credit-card-outline',
  More: 'apps',
};

export type OwnerTabParamList = {
  Dashboard: undefined;
  Students: undefined;
  Attendance: undefined;
  Fees: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<OwnerTabParamList>();

function OwnerTabsInner() {
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
            // Tapping a tab icon should always land on the tab's root screen,
            // regardless of which tab is currently focused. Find the target tab's
            // nested-stack state and, if it's not already at the root, dispatch
            // popToTop targeted at that nested navigator via its state key.
            const state = navigation.getState();
            const targetName = (e.target ?? '').split('-')[0];
            const targetRoute = state?.routes.find((r) => r.name === targetName);
            const nested = targetRoute?.state;
            if (nested?.key && (nested.index ?? 0) > 0) {
              navigation.dispatch({
                ...StackActions.popToTop(),
                target: nested.key,
              });
            }
          },
        })}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            headerTitle: () => <DashboardHeaderLeft />,
            headerRight: () => <DashboardHeaderRight />,
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

export function OwnerTabs() {
  return (
    <FABProvider>
      <OwnerTabsInner />
    </FABProvider>
  );
}

const makeStyles = (_colors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
});
