import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { PaymentHistoryScreen } from '../screens/parent/PaymentHistoryScreen';
import { ReceiptScreen } from '../screens/parent/ReceiptScreen';

export type ParentPaymentsStackParamList = {
  PaymentHistory: undefined;
  Receipt: { feeDueId: string };
};

const Stack = createNativeStackNavigator<ParentPaymentsStackParamList>();

export function ParentPaymentsStack() {
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
        name="PaymentHistory"
        component={PaymentHistoryScreen}
        options={{ title: 'Payments' }}
      />
      <Stack.Screen
        name="Receipt"
        component={ReceiptScreen}
        options={{ title: 'Receipt' }}
      />
    </Stack.Navigator>
  );
}
