import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { FeesHomeScreen } from '../screens/common/FeesHomeScreen';
import { StudentFeeDetailScreen } from '../screens/common/StudentFeeDetailScreen';
import { PaymentRequestFormScreen } from '../screens/staff/PaymentRequestFormScreen';

export type FeesStackParamList = {
  FeesHome: undefined;
  StudentFeeDetail: { studentId: string; studentName: string };
  PaymentRequestForm: {
    studentId: string;
    monthKey: string;
    amount: number;
    requestId?: string;
    existingNotes?: string;
  };
};

const Stack = createNativeStackNavigator<FeesStackParamList>();

export function FeesStack() {
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
      <Stack.Screen name="FeesHome" component={FeesHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="StudentFeeDetail"
        component={StudentFeeDetailScreen}
        options={({ route }) => ({
          title: route.params.studentName,
        })}
      />
      <Stack.Screen
        name="PaymentRequestForm"
        component={PaymentRequestFormScreen}
        options={{ title: 'Create Payment Request' }}
      />
    </Stack.Navigator>
  );
}
