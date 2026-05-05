import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { CommonActions } from '@react-navigation/native';
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

// Map of tab name → root screen of that tab's nested stack. Used by the
// tabPress handler to navigate the nested stack to its root regardless of
// what the parent's snapshot of the nested state currently looks like (the
// snapshot can be undefined when a tab was reached via GlobalFAB rather
// than through the tab bar). Dashboard is intentionally absent because
// it's a single-screen tab with no nested stack.
const TAB_ROOTS: Record<string, string> = {
  Students: 'StudentsList',
  Attendance: 'AttendanceMain',
  Fees: 'FeesHome',
  More: 'MoreHome',
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
            const targetName = (e.target ?? '').split('-')[0];
            if (!targetName) return;
            const rootRouteName = TAB_ROOTS[targetName];

            // Dirty-form path. We show the prompt here (in the tab
            // navigator's screenListener — same `navigation` instance
            // the tab bar emits to, so this listener always runs) but
            // delegate the actual discard action back to each dirty
            // form via `discardAllDirtyForms`. Each form's registered
            // callback sets its own bypassRef and dispatches popToTop
            // on its own focused navigation, which is the only reliable
            // way to pop nested screens from a parent listener.
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
                      // Pop each dirty form off its own stack (via the
                      // forms' registered callbacks). Their bypassRef
                      // suppresses the second beforeRemove prompt.
                      discardAllDirtyForms();
                      // Then switch to the tapped tab.
                      navigation.dispatch(
                        CommonActions.navigate({
                          name: targetName,
                          ...(rootRouteName
                            ? { params: { screen: rootRouteName } }
                            : {}),
                        }),
                      );
                    },
                  },
                ],
              );
              return;
            }

            // Clean tab tap: reset the target tab's stack to its root.
            if (!rootRouteName) return; // single-screen tab (e.g. Dashboard)
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
