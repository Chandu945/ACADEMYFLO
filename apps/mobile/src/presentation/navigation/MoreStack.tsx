import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { MoreScreen } from '../screens/settings/MoreScreen';
import { AcademySettingsScreen } from '../screens/settings/AcademySettingsScreen';
import { AuditLogsScreen } from '../screens/owner/AuditLogsScreen';
import { SubscriptionScreen } from '../screens/subscription/SubscriptionScreen';
import { ExpensesHomeScreen } from '../screens/expenses/ExpensesHomeScreen';
import { ExpenseFormScreen } from '../screens/expenses/ExpenseFormScreen';
import { ParentProfileScreen } from '../screens/parent/ParentProfileScreen';
import { ChangePasswordScreen } from '../screens/parent/ChangePasswordScreen';
import { AcademyInfoScreen } from '../screens/parent/AcademyInfoScreen';
import { PaymentHistoryScreen } from '../screens/parent/PaymentHistoryScreen';
import { InstituteInfoScreen } from '../screens/settings/InstituteInfoScreen';
import { PaymentMethodsScreen } from '../screens/settings/PaymentMethodsScreen';
import { EnquiryListScreen } from '../screens/enquiry/EnquiryListScreen';
import { AddEnquiryScreen } from '../screens/enquiry/AddEnquiryScreen';
import { EnquiryDetailScreen } from '../screens/enquiry/EnquiryDetailScreen';
import { EditEnquiryScreen } from '../screens/enquiry/EditEnquiryScreen';
import { EventListScreen } from '../screens/event/EventListScreen';
import { AddEventScreen } from '../screens/event/AddEventScreen';
import { EditEventScreen } from '../screens/event/EditEventScreen';
import { EventDetailScreen } from '../screens/event/EventDetailScreen';
import { EventGalleryScreen } from '../screens/event/EventGalleryScreen';
import { PhotoViewerScreen } from '../screens/event/PhotoViewerScreen';
import { BatchesListScreen } from '../screens/batches/BatchesListScreen';
import { BatchFormScreen } from '../screens/batches/BatchFormScreen';
import { BatchDetailScreen } from '../screens/batches/BatchDetailScreen';
import { AddStudentToBatchScreen } from '../screens/batches/AddStudentToBatchScreen';
import { StaffListScreen } from '../screens/owner/StaffListScreen';
import { StaffFormScreen } from '../screens/owner/StaffFormScreen';
import { StaffAttendanceScreen } from '../screens/owner/StaffAttendanceScreen';
import { StaffAttendanceDailyReportScreen } from '../screens/owner/StaffAttendanceDailyReportScreen';
import { StaffAttendanceMonthlySummaryScreen } from '../screens/owner/StaffAttendanceMonthlySummaryScreen';
import { ReportsHomeScreen } from '../screens/owner/ReportsHomeScreen';
import { DeleteAccountScreen } from '../screens/account/DeleteAccountScreen';
import { OverdueStudentsScreen } from '../screens/fees/OverdueStudentsScreen';
import { RateAcademyScreen } from '../screens/parent/RateAcademyScreen';
import { AcademyReviewsScreen } from '../screens/owner/AcademyReviewsScreen';
import { HeaderBackButton } from '../components/ui/HeaderBackButton';
import type { ExpenseItem } from '../../domain/expense/expense.types';
import type { EventDetail } from '../../domain/event/event.types';
import type { GalleryPhoto } from '../../domain/event/event-gallery.types';
import type { BatchListItem } from '../../domain/batch/batch.types';
import type { StaffListItem } from '../../domain/staff/staff.types';
import type { EnquiryDetail } from '../../domain/enquiry/enquiry.types';

export type MoreStackParamList = {
  MoreHome: undefined;
  AcademySettings: undefined;
  ExpensesHome: undefined;
  ExpenseForm: { mode: 'create' } | { mode: 'edit'; expense: ExpenseItem };
  InstituteInfo: undefined;
  PaymentMethods: undefined;
  EnquiryList: { filter?: string } | undefined;
  AddEnquiry: undefined;
  EnquiryDetail: { enquiryId: string };
  EditEnquiry: { enquiry: EnquiryDetail };
  EventList: undefined;
  AddEvent: undefined;
  EditEvent: { event: EventDetail };
  EventDetail: { eventId: string };
  EventGallery: { eventId: string; eventTitle: string };
  PhotoViewer: { eventId: string; photos: GalleryPhoto[]; initialIndex: number };
  AuditLogs: undefined;
  Subscription: undefined;
  ParentProfile: undefined;
  ChangePassword: undefined;
  AcademyInfo: undefined;
  PaymentHistory: undefined;
  BatchesList: undefined;
  BatchForm: { mode: 'create' | 'edit'; batch?: BatchListItem };
  BatchDetail: { batch: BatchListItem };
  AddStudentToBatch: { batchId: string; existingStudentIds: string[] };
  StaffList: undefined;
  StaffForm: { mode: 'create' | 'edit'; staff?: StaffListItem };
  StaffAttendance: undefined;
  StaffAttendanceDailyReport: { date: string };
  StaffAttendanceMonthlySummary: { month: string };
  ReportsHome: undefined;
  OverdueStudents: undefined;
  RateAcademy: undefined;
  AcademyReviews: undefined;
  DeleteAccount: undefined;
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

export function MoreStack() {
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
        name="MoreHome"
        component={MoreScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AcademySettings"
        component={AcademySettingsScreen}
        options={({ navigation }) => ({
          title: 'Academy Settings',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('MoreHome')} />
          ),
        })}
      />
      <Stack.Screen
        name="ExpensesHome"
        component={ExpensesHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ExpenseForm"
        component={ExpenseFormScreen}
        options={({ route, navigation }) => ({
          title: (route.params as { mode: string }).mode === 'create' ? 'Add Expense' : 'Edit Expense',
          headerLeft: () => (
            <HeaderBackButton
              onPress={() => navigation.navigate('ExpensesHome')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="InstituteInfo"
        component={InstituteInfoScreen}
        options={({ navigation }) => ({
          title: 'Institute Information',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('MoreHome')} />
          ),
        })}
      />
      <Stack.Screen
        name="PaymentMethods"
        component={PaymentMethodsScreen}
        options={({ navigation }) => ({
          title: 'Payment Methods',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('MoreHome')} />
          ),
        })}
      />
      <Stack.Screen
        name="EnquiryList"
        component={EnquiryListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddEnquiry"
        component={AddEnquiryScreen}
        options={({ navigation }) => ({
          title: 'Add Enquiry',
          headerBackVisible: true,
          headerLeft: () => (
            <HeaderBackButton
              onPress={() => navigation.navigate('EnquiryList')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="EnquiryDetail"
        component={EnquiryDetailScreen}
        options={({ navigation }) => ({
          title: 'Enquiry Detail',
          headerBackVisible: true,
          headerLeft: () => (
            <HeaderBackButton
              onPress={() => navigation.navigate('EnquiryList')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="EditEnquiry"
        component={EditEnquiryScreen}
        options={({ route, navigation }) => ({
          title: 'Edit Enquiry',
          headerBackVisible: true,
          headerLeft: () => (
            <HeaderBackButton
              onPress={() => navigation.navigate('EnquiryDetail', { enquiryId: (route.params as { enquiry: { id: string } }).enquiry.id })}
            />
          ),
        })}
      />
      <Stack.Screen
        name="EventList"
        component={EventListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddEvent"
        component={AddEventScreen}
        options={({ navigation }) => ({
          title: 'Add Event',
          headerBackVisible: true,
          headerLeft: () => (
            <HeaderBackButton
              onPress={() => navigation.navigate('EventList')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="EditEvent"
        component={EditEventScreen}
        options={({ route, navigation }) => ({
          title: 'Edit Event',
          headerBackVisible: true,
          headerLeft: () => (
            <HeaderBackButton
              onPress={() => navigation.navigate('EventDetail', { eventId: (route.params as { event: { id: string } }).event.id })}
            />
          ),
        })}
      />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={({ navigation }) => ({
          title: 'Event Detail',
          headerBackVisible: true,
          headerLeft: () => (
            <HeaderBackButton
              onPress={() => navigation.navigate('EventList')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="EventGallery"
        component={EventGalleryScreen}
        options={({ navigation }) => ({
          title: 'Photo Gallery',
          headerBackVisible: true,
          headerLeft: () => (
            <HeaderBackButton
              onPress={() => navigation.navigate('EventList')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="PhotoViewer"
        component={PhotoViewerScreen}
        options={{
          title: '',
          headerTransparent: true,
          headerTintColor: colors.white,
          headerStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="AuditLogs"
        component={AuditLogsScreen}
        options={({ navigation }) => ({
          title: 'Audit Logs',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('MoreHome')} />
          ),
        })}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={({ navigation }) => ({
          title: 'Subscription',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('MoreHome')} />
          ),
        })}
      />
      <Stack.Screen
        name="ParentProfile"
        component={ParentProfileScreen}
        options={({ navigation }) => ({
          title: 'My Profile',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('MoreHome')} />
          ),
        })}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={({ navigation }) => ({
          title: 'Change Password',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('ParentProfile')} />
          ),
        })}
      />
      <Stack.Screen
        name="AcademyInfo"
        component={AcademyInfoScreen}
        options={({ navigation }) => ({
          title: 'Academy Info',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('MoreHome')} />
          ),
        })}
      />
      <Stack.Screen
        name="PaymentHistory"
        component={PaymentHistoryScreen}
        options={({ navigation }) => ({
          title: 'Payment History',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('MoreHome')} />
          ),
        })}
      />
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
      <Stack.Screen
        name="StaffList"
        component={StaffListScreen}
        options={({ navigation }) => ({
          title: 'Staff',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('MoreHome')} />
          ),
        })}
      />
      <Stack.Screen
        name="StaffForm"
        component={StaffFormScreen}
        options={({ route, navigation }) => ({
          title: route.params.mode === 'create' ? 'Add Staff' : 'Edit Staff',
          headerBackVisible: true,
          headerLeft: () => (
            <HeaderBackButton
              onPress={() => navigation.navigate('StaffList')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="StaffAttendance"
        component={StaffAttendanceScreen}
        options={({ navigation }) => ({
          title: 'Staff Attendance',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('MoreHome')} />
          ),
        })}
      />
      <Stack.Screen
        name="StaffAttendanceDailyReport"
        component={StaffAttendanceDailyReportScreen}
        options={({ navigation }) => ({
          title: 'Staff Daily Report',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('StaffAttendance')} />
          ),
        })}
      />
      <Stack.Screen
        name="StaffAttendanceMonthlySummary"
        component={StaffAttendanceMonthlySummaryScreen}
        options={({ navigation }) => ({
          title: 'Staff Monthly Summary',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('StaffAttendance')} />
          ),
        })}
      />
      <Stack.Screen
        name="ReportsHome"
        component={ReportsHomeScreen}
        options={({ navigation }) => ({
          title: 'Reports',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('MoreHome')} />
          ),
        })}
      />
      <Stack.Screen
        name="OverdueStudents"
        component={OverdueStudentsScreen}
        options={({ navigation }) => ({
          title: 'Overdue Students',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('MoreHome')} />
          ),
        })}
      />
      <Stack.Screen
        name="RateAcademy"
        component={RateAcademyScreen}
        options={({ navigation }) => ({
          title: 'Rate Academy',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('MoreHome')} />
          ),
        })}
      />
      <Stack.Screen
        name="AcademyReviews"
        component={AcademyReviewsScreen}
        options={({ navigation }) => ({
          title: 'Parent Reviews',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('MoreHome')} />
          ),
        })}
      />
      <Stack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
        options={({ navigation }) => ({
          title: 'Delete Account',
          headerLeft: () => (
            <HeaderBackButton onPress={() => navigation.navigate('MoreHome')} />
          ),
        })}
      />
    </Stack.Navigator>
  );
}
