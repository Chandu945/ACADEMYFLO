import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StudentListItem } from '../../domain/student/student.types';
import { StudentsListScreen } from '../screens/students/StudentsListScreen';
import { StudentFormScreen } from '../screens/students/StudentFormScreen';
import { StudentDetailScreen } from '../screens/students/StudentDetailScreen';
import { HeaderBackButton } from '../components/ui/HeaderBackButton';

export type StudentsStackParamList = {
  StudentsList: undefined;
  StudentForm: { mode: 'create' | 'edit'; student?: StudentListItem };
  StudentDetail: { student: StudentListItem };
};

const Stack = createNativeStackNavigator<StudentsStackParamList>();

export function StudentsStack() {
  return (
    // @ts-expect-error @types/react version mismatch in monorepo
    <Stack.Navigator>
      <Stack.Screen
        name="StudentsList"
        component={StudentsListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StudentForm"
        component={StudentFormScreen}
        options={({ route, navigation }) => ({
          title: route.params.mode === 'create' ? 'Add Student' : 'Edit Student',
          headerLeft: () => (
            <HeaderBackButton
              onPress={() => navigation.navigate('StudentsList')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="StudentDetail"
        component={StudentDetailScreen}
        options={{ title: 'Student Detail' }}
      />
    </Stack.Navigator>
  );
}
