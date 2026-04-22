import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { ChildDetailScreen } from '../screens/parent/ChildDetailScreen';
import { ReceiptScreen } from '../screens/parent/ReceiptScreen';
import { ManualPaymentScreen } from '../screens/parent/ManualPaymentScreen';

export type ParentFeesStackParamList = {
  ParentFeesOverview: { studentId: string; fullName: string };
  Receipt: { feeDueId: string };
  ManualPayment: {
    feeDueId: string;
    studentId: string;
    monthKey: string;
    amount: number;
  };
};

const Stack = createNativeStackNavigator<ParentFeesStackParamList>();

export function ParentFeesStack() {
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
      <Stack.Screen
        name="ParentFeesOverview"
        component={ChildDetailScreen}
        options={{ title: 'Fees' }}
      />
      <Stack.Screen
        name="Receipt"
        component={ReceiptScreen}
        options={{ title: 'Receipt' }}
      />
      <Stack.Screen
        name="ManualPayment"
        component={ManualPaymentScreen}
        options={{ title: 'Pay' }}
      />
    </Stack.Navigator>
  );
}
