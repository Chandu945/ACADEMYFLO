import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ParentHomeStack } from './ParentHomeStack';
import { MoreStack } from './MoreStack';
import { colors, fontSizes, fontWeights } from '../theme';

const TAB_ICONS: Record<string, string> = {
  Home: 'home-outline',
  More: 'dots-horizontal',
};

export type ParentTabParamList = {
  Home: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<ParentTabParamList>();

export function ParentTabs() {
  return (
    // @ts-expect-error React Navigation 6 types incompatible with @types/react@19 hoisted in monorepo
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: fontWeights.semibold, fontSize: fontSizes.lg },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarIcon: ({ color, size }: { color: string; size: number }) => (
          <Icon name={TAB_ICONS[route.name] ?? 'circle'} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={ParentHomeStack} options={{ headerShown: false }} />
      <Tab.Screen name="More" component={MoreStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
