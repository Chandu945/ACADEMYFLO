import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SubscriptionScreen } from '../screens/subscription/SubscriptionScreen';

export type BlockedStackParamList = {
  SubscriptionBlocked: undefined;
};

const Stack = createNativeStackNavigator<BlockedStackParamList>();

export function BlockedStack() {
  return (
    // @ts-expect-error React Navigation 6 types incompatible with @types/react@19 hoisted in monorepo
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SubscriptionBlocked" component={SubscriptionScreen} />
    </Stack.Navigator>
  );
}
