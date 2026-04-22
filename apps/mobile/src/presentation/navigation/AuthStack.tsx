import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OwnerSignupScreen } from '../screens/auth/OwnerSignupScreen';
import { AcademySetupScreen } from '../screens/auth/AcademySetupScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { useTheme } from '../context/ThemeContext';

export type AuthStackParamList = {
  Login: undefined;
  OwnerSignup: undefined;
  AcademySetup: undefined;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  const { colors } = useTheme();
  const headerOptions = useMemo(
    () => ({
      headerShown: true,
      headerTitle: '',
      headerBackTitle: 'Back',
      headerShadowVisible: false,
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
    }),
    [colors],
  );

  return (
    // @ts-expect-error @types/react version mismatch in monorepo
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OwnerSignup" component={OwnerSignupScreen} options={headerOptions} />
      <Stack.Screen name="AcademySetup" component={AcademySetupScreen} />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={headerOptions}
      />
    </Stack.Navigator>
  );
}
