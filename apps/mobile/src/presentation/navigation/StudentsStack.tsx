import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StudentListItem } from '../../domain/student/student.types';
import { StudentsListScreen } from '../screens/students/StudentsListScreen';
import { StudentFormScreen } from '../screens/students/StudentFormScreen';
import { StudentDetailScreen } from '../screens/students/StudentDetailScreen';
import { HeaderBackButton } from '../components/ui/HeaderBackButton';
import { popToOrReplaceList } from './nav-helpers';
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
        headerStyle: { backgroundColor: colors.bg },
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
                if (route.params.mode === 'edit') {
                  // Edit mode can be reached via two paths:
                  //   1. StudentsList → row → StudentDetail → tap Edit
                  //   2. StudentsList → row action menu → Edit  (skips Detail)
                  // Path 2 means StudentDetail isn't always in history, so
                  // `navigate('StudentDetail', ...)` would PUSH a new Detail
                  // on top of the form instead of popping the form. Since
                  // the form wouldn't be removed, `beforeRemove` would never
                  // fire and the unsaved-changes hook's Discard prompt would
                  // be silently skipped.
                  //
                  // goBack() pops exactly one screen — Detail (via path 1)
                  // or StudentsList (via path 2) — and reliably triggers
                  // beforeRemove on the form regardless of entry path.
                  if (navigation.canGoBack()) navigation.goBack();
                } else {
                  // Create mode can be entered via Global FAB → StudentForm
                  // directly, in which case StudentsList may not be in the
                  // stack history. popToOrReplaceList handles both cases
                  // (popTo if list is in history, else replace), and always
                  // removes the current screen so beforeRemove fires.
                  popToOrReplaceList(navigation, 'StudentsList');
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
