import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StudentListItem } from '../../domain/student/student.types';
import { StudentsListScreen } from '../screens/students/StudentsListScreen';
import { StudentFormScreen } from '../screens/students/StudentFormScreen';
import { StudentDetailScreen } from '../screens/students/StudentDetailScreen';
import { HeaderBackButton } from '../components/ui/HeaderBackButton';
import { useTheme } from '../context/ThemeContext';

export type StudentsStackParamList = {
  StudentsList: undefined;
  StudentForm: { mode: 'create' | 'edit'; student?: StudentListItem };
  StudentDetail: { student: StudentListItem };
};

const Stack = createNativeStackNavigator<StudentsStackParamList>();

export function StudentsStack() {
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
              onPress={() => {
                if (route.params.mode === 'edit' && route.params.student) {
                  navigation.navigate('StudentDetail', { student: route.params.student });
                } else {
                  navigation.navigate('StudentsList');
                }
              }}
            />
          ),
        })}
      />
      <Stack.Screen
        name="StudentDetail"
        component={StudentDetailScreen}
        options={({ navigation }) => ({
          title: 'Student Detail',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('StudentsList')} />
          ),
        })}
      />
    </Stack.Navigator>
  );
}
