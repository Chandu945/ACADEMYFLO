import React from 'react';
import { StackActions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppIcon } from '../components/ui/AppIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ParentDashboardScreen } from '../screens/parent/ParentDashboardScreen';
import { ParentHomeStack } from './ParentHomeStack';
import { ParentPaymentsStack } from './ParentPaymentsStack';
import { MoreStack } from './MoreStack';
import { useTheme } from '../context/ThemeContext';
import { makeTabScreenOptions } from './tab-options';

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Dashboard: { active: 'view-dashboard', inactive: 'view-dashboard-outline' },
  Children: { active: 'account-child', inactive: 'account-child-outline' },
  Payments: { active: 'credit-card', inactive: 'credit-card-outline' },
  More: { active: 'menu', inactive: 'dots-horizontal' },
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
      screenOptions={({ route }) => ({
        ...makeTabScreenOptions(colors, insets.bottom),
        tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons?.active : icons?.inactive;

          return <AppIcon name={iconName ?? 'circle'} size={size} color={color} />;
        },
      })}
      screenListeners={({ navigation }) => ({
        tabPress: (e) => {
          // Tapping a tab icon should always land on the tab's root screen.
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
        component={ParentDashboardScreen}
        options={{ title: 'Dashboard', headerShown: false }}
      />
      <Tab.Screen name="Children" component={ParentHomeStack} options={{ headerShown: false }} />
      <Tab.Screen name="Payments" component={ParentPaymentsStack} options={{ headerShown: false }} />
      <Tab.Screen name="More" component={MoreStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
