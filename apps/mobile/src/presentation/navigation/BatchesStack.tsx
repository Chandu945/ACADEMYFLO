import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { BatchListItem } from '../../domain/batch/batch.types';
import { BatchesListScreen } from '../screens/batches/BatchesListScreen';
import { BatchFormScreen } from '../screens/batches/BatchFormScreen';
import { BatchDetailScreen } from '../screens/batches/BatchDetailScreen';
import { AddStudentToBatchScreen } from '../screens/batches/AddStudentToBatchScreen';
import { HeaderBackButton } from '../components/ui/HeaderBackButton';
import { useTheme } from '../context/ThemeContext';

export type BatchesStackParamList = {
  BatchesList: undefined;
  BatchForm: { mode: 'create' | 'edit'; batch?: BatchListItem };
  BatchDetail: { batch: BatchListItem };
  AddStudentToBatch: { batchId: string; existingStudentIds: string[] };
};

const Stack = createNativeStackNavigator<BatchesStackParamList>();

export function BatchesStack() {
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
        name="BatchesList"
        component={BatchesListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BatchForm"
        component={BatchFormScreen}
        options={({ route, navigation }) => ({
          title: route.params.mode === 'create' ? 'Add Batch' : 'Edit Batch',
          headerLeft: () => (
            <HeaderBackButton
              onPress={() => {
                if (route.params.mode === 'edit' && route.params.batch) {
                  navigation.navigate('BatchDetail', { batch: route.params.batch });
                } else {
                  navigation.navigate('BatchesList');
                }
              }}
            />
          ),
        })}
      />
      <Stack.Screen
        name="BatchDetail"
        component={BatchDetailScreen}
        options={({ navigation }) => ({
          title: 'Batch Details',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('BatchesList')} />
          ),
        })}
      />
      <Stack.Screen
        name="AddStudentToBatch"
        component={AddStudentToBatchScreen}
        options={{ title: 'Add Student' }}
      />
    </Stack.Navigator>
  );
}
