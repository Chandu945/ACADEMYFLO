import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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

const TAB_ICONS: Record<string, string> = {
  Dashboard: 'view-dashboard-outline',
  Students: 'school-outline',
  Attendance: 'calendar-check-outline',
  Fees: 'currency-inr',
  More: 'dots-horizontal',
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
        screenOptions={({ route }) => ({
          ...makeTabScreenOptions(colors, insets.bottom),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            // @ts-expect-error react-native-vector-icons types incompatible with @types/react@19
            <Icon name={TAB_ICONS[route.name] ?? 'circle'} size={size} color={color} />
          ),
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
