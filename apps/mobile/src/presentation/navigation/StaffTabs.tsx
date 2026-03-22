import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppIcon } from '../components/ui/AppIcon';
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

const TAB_ICONS: Record<string, string> = {
  Dashboard: 'view-dashboard-outline',
  Students: 'school-outline',
  Attendance: 'calendar-check-outline',
  Fees: 'currency-inr',
  More: 'dots-horizontal',
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
        screenOptions={({ route }) => ({
          ...makeTabScreenOptions(colors, insets.bottom),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            
            <AppIcon name={TAB_ICONS[route.name] ?? 'circle'} size={size} color={color} />
          ),
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
