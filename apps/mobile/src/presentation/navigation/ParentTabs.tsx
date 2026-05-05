import React from 'react';
import { CommonActions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ParentDashboardScreen } from '../screens/parent/ParentDashboardScreen';
import { ParentHomeStack } from './ParentHomeStack';
import { ParentPaymentsStack } from './ParentPaymentsStack';
import { MoreStack } from './MoreStack';
import { useTheme } from '../context/ThemeContext';
import { makeTabScreenOptions } from './tab-options';
import { CustomTabBar } from './CustomTabBar';
import { hasAnyDirtyForm, discardAllDirtyForms } from './dirty-form-registry';
import { crossAlert } from '../utils/crossPlatformAlert';
import type { IconMap } from './CustomTabBar';

const TAB_ICONS: IconMap = {
  Dashboard: { active: 'view-grid', inactive: 'view-grid-outline' },
  Children: { active: 'account-multiple', inactive: 'account-multiple-outline' },
  Payments: { active: 'credit-card', inactive: 'credit-card-outline' },
  More: 'apps',
};

// See OwnerTabs.tsx for why this is a hardcoded map rather than a read of
// the parent's nested-stack snapshot.
const TAB_ROOTS: Record<string, string> = {
  Children: 'ChildrenList',
  Payments: 'PaymentHistory',
  More: 'MoreHome',
};

export type ParentTabParamList = {
  Dashboard: undefined;
  Children: undefined;
  Payments: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<ParentTabParamList>();

export function ParentTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    // @ts-expect-error React Navigation 7 bottom-tabs type mismatch with React 18
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
        component={ParentDashboardScreen}
        options={{ title: 'Dashboard', headerShown: false }}
      />
      <Tab.Screen name="Children" component={ParentHomeStack} options={{ headerShown: false }} />
      <Tab.Screen name="Payments" component={ParentPaymentsStack} options={{ headerShown: false }} />
      <Tab.Screen name="More" component={MoreStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
