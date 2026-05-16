import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { ChildrenListScreen } from '../screens/parent/ChildrenListScreen';
import { ChildDetailScreen } from '../screens/parent/ChildDetailScreen';
import { ReceiptScreen } from '../screens/parent/ReceiptScreen';
import { ManualPaymentScreen } from '../screens/parent/ManualPaymentScreen';

export type ParentHomeStackParamList = {
  ChildrenList: undefined;
  ChildDetail: { studentId: string; fullName: string };
  Receipt: { feeDueId: string };
  ManualPayment: {
    feeDueId: string;
    studentId: string;
    monthKey: string;
    amount: number;
  };
};

const Stack = createNativeStackNavigator<ParentHomeStackParamList>();

export function ParentHomeStack() {
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
        name="ChildrenList"
        component={ChildrenListScreen}
        // Title reflects the single-child default. When a parent has 2+
        // children linked, ChildrenListScreen renders the list and the
        // visible greeting block carries the context; the header title
        // becomes a minor mismatch worth living with vs. plumbing child
        // count into navigation options.
        options={{ title: 'My Child' }}
      />
      <Stack.Screen
        name="ChildDetail"
        component={ChildDetailScreen}
        options={({ route }) => ({ title: route.params.fullName })}
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
