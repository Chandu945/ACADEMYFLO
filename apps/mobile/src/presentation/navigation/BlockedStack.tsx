import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SubscriptionScreen } from '../screens/subscription/SubscriptionScreen';
import { SubscriptionBlockedScreen } from '../screens/subscription/SubscriptionBlockedScreen';
import { useAuth } from '../context/AuthContext';

export type BlockedStackParamList = {
  SubscriptionBlocked: undefined;
};

const Stack = createNativeStackNavigator<BlockedStackParamList>();

export function BlockedStack() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  return (
    // @ts-expect-error @types/react version mismatch in monorepo
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="SubscriptionBlocked"
        component={isOwner ? SubscriptionScreen : SubscriptionBlockedScreen}
      />
    </Stack.Navigator>
  );
}
