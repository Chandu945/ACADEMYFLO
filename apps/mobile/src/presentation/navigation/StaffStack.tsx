import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StaffListItem } from '../../domain/staff/staff.types';
import { StaffListScreen } from '../screens/owner/StaffListScreen';
import { StaffFormScreen } from '../screens/owner/StaffFormScreen';
import { StaffAttendanceScreen } from '../screens/owner/StaffAttendanceScreen';
import { StaffAttendanceDailyReportScreen } from '../screens/owner/StaffAttendanceDailyReportScreen';
import { StaffAttendanceMonthlySummaryScreen } from '../screens/owner/StaffAttendanceMonthlySummaryScreen';
import { HeaderBackButton } from '../components/ui/HeaderBackButton';
import { useTheme } from '../context/ThemeContext';

export type StaffStackParamList = {
  StaffList: undefined;
  StaffForm: { mode: 'create' | 'edit'; staff?: StaffListItem };
  StaffAttendance: undefined;
  StaffAttendanceDailyReport: { date: string };
  StaffAttendanceMonthlySummary: { month: string };
};

const Stack = createNativeStackNavigator<StaffStackParamList>();

export function StaffStack() {
  const { colors } = useTheme();
  return (
    // @ts-expect-error @types/react version mismatch in monorepo
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="StaffList" component={StaffListScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="StaffForm"
        component={StaffFormScreen}
        options={({ route, navigation }) => ({
          title: route.params.mode === 'create' ? 'Add Staff' : 'Edit Staff',
          headerLeft: () => (
            <HeaderBackButton
              onPress={() => navigation.navigate('StaffList')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="StaffAttendance"
        component={StaffAttendanceScreen}
        options={{ title: 'Staff Attendance' }}
      />
      <Stack.Screen
        name="StaffAttendanceDailyReport"
        component={StaffAttendanceDailyReportScreen}
        options={{ title: 'Staff Daily Report' }}
      />
      <Stack.Screen
        name="StaffAttendanceMonthlySummary"
        component={StaffAttendanceMonthlySummaryScreen}
        options={{ title: 'Staff Monthly Summary' }}
      />
    </Stack.Navigator>
  );
}
