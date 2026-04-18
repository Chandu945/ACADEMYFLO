import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { ChildrenListScreen } from '../screens/parent/ChildrenListScreen';
import { ChildDetailScreen } from '../screens/parent/ChildDetailScreen';
import { ReceiptScreen } from '../screens/parent/ReceiptScreen';

export type ParentHomeStackParamList = {
  ChildrenList: undefined;
  ChildDetail: { studentId: string; fullName: string };
  Receipt: { feeDueId: string };
};

const Stack = createNativeStackNavigator<ParentHomeStackParamList>();

export function ParentHomeStack() {
  const { colors } = useTheme();
  return (
    // @ts-expect-error @types/react version mismatch in monorepo
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="ChildrenList"
        component={ChildrenListScreen}
        options={{ title: 'My Children' }}
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
    </Stack.Navigator>
  );
}
