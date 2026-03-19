import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
    // @ts-expect-error @types/react version mismatch in monorepo
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...makeTabScreenOptions(colors, insets.bottom),
        tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons?.active : icons?.inactive;
          // @ts-expect-error react-native-vector-icons types incompatible with @types/react@19
          return <Icon name={iconName ?? 'circle'} size={size} color={color} />;
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
