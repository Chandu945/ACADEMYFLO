/**
 * Mobile flow integration test — verifies the core user journey:
 * login → dashboard → attendance → students
 *
 * Each step mocks the API layer and verifies component rendering.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { AuthContext } from '../../presentation/context/AuthContext';
import type { AuthContextValue, AuthPhase } from '../../presentation/context/AuthContext';
import type { SubscriptionInfo } from '../../domain/subscription/subscription.types';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-image-picker', () => ({ launchImageLibrary: jest.fn() }));

jest.mock('@react-navigation/native-stack', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }: { children: unknown }) => {
        const first = R.Children.toArray(children)[0];
        return R.createElement(R.Fragment, null, first);
      },
      Screen: ({ component: C }: { component: React.ComponentType }) => R.createElement(C),
    }),
  };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }: { children: unknown }) =>
        R.createElement(R.Fragment, null, children),
      Screen: ({ component: C }: { component: React.ComponentType }) => R.createElement(C),
    }),
  };
});

jest.mock('@react-navigation/native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return {
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useRoute: () => ({ params: { mode: 'create' } }),
    useFocusEffect: jest.fn(),
    NavigationContainer: ({ children }: { children: React.ReactNode }) =>
      R.createElement(R.Fragment, null, children),
  };
});

// Mock API modules
jest.mock('../../infra/dashboard/dashboard-api', () => ({
  getOwnerDashboard: jest.fn(),
  getMonthlyChart: jest.fn().mockResolvedValue({ ok: true, value: { data: [] } }),
  getBirthdays: jest.fn().mockResolvedValue({ ok: true, value: { students: [] } }),
}));

jest.mock('../../infra/event/event-api', () => ({
  getEventSummary: jest.fn().mockResolvedValue({ ok: true, value: { thisMonth: { total: 0, upcoming: 0 }, nextMonth: { total: 0, upcoming: 0 } } }),
  fetchEvents: jest.fn().mockResolvedValue({ ok: true, value: { items: [], total: 0 } }),
}));

jest.mock('../../infra/enquiry/enquiry-api', () => ({
  getEnquirySummary: jest.fn().mockResolvedValue({ ok: true, value: { total: 0, open: 0, converted: 0, closed: 0 } }),
  fetchEnquiries: jest.fn().mockResolvedValue({ ok: true, value: { items: [], total: 0 } }),
}));

jest.mock('../../infra/attendance/attendance-api', () => ({
  getMonthDailyCounts: jest.fn().mockResolvedValue({ ok: true, value: { totalStudents: 0, days: [] } }),
  getDailyAttendance: jest.fn().mockResolvedValue({ ok: true, value: { students: [] } }),
  markAttendance: jest.fn().mockResolvedValue({ ok: true, value: {} }),
  bulkSetAbsences: jest.fn().mockResolvedValue({ ok: true, value: {} }),
  getDailyReport: jest.fn().mockResolvedValue({ ok: true, value: { date: '2026-03-16', students: [] } }),
  getMonthlySummary: jest.fn().mockResolvedValue({ ok: true, value: { students: [] } }),
  getStudentMonthlyDetail: jest.fn().mockResolvedValue({ ok: true, value: { dates: [] } }),
  attendanceApi: {
    getMonthDailyCounts: jest.fn().mockResolvedValue({ ok: true, value: { totalStudents: 0, days: [] } }),
    getDailyAttendance: jest.fn().mockResolvedValue({ ok: true, value: { students: [] } }),
    markAttendance: jest.fn().mockResolvedValue({ ok: true, value: {} }),
    bulkSetAbsences: jest.fn().mockResolvedValue({ ok: true, value: {} }),
    getDailyReport: jest.fn().mockResolvedValue({ ok: true, value: { date: '2026-03-16', students: [] } }),
    getMonthlySummary: jest.fn().mockResolvedValue({ ok: true, value: { students: [] } }),
    getStudentMonthlyDetail: jest.fn().mockResolvedValue({ ok: true, value: { dates: [] } }),
  },
}));

jest.mock('../../infra/staff-attendance/staff-attendance-api', () => ({
  getStaffDailyReport: jest.fn().mockResolvedValue({ ok: true, value: { presentCount: 0, absentCount: 0 } }),
  getStaffMonthlySummary: jest.fn().mockResolvedValue({ ok: true, value: { items: [] } }),
  staffAttendanceApi: {
    getStaffDailyReport: jest.fn().mockResolvedValue({ ok: true, value: { presentCount: 0, absentCount: 0 } }),
    getStaffMonthlySummary: jest.fn().mockResolvedValue({ ok: true, value: { items: [] } }),
  },
}));

jest.mock('../../infra/auth/auth-api', () => ({
  authApi: {
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    setupAcademy: jest.fn(),
  },
}));

jest.mock('../../infra/auth/token-store', () => ({
  tokenStore: {
    save: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    clear: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../infra/auth/device-id', () => ({
  deviceIdStore: {
    get: jest.fn().mockResolvedValue('test-device'),
  },
}));

jest.mock('../../infra/http/api-client', () => ({
  accessTokenStore: { value: null },
  registerAuthFailureHandler: jest.fn(),
  apiGet: jest.fn().mockResolvedValue({ ok: true, value: { data: [], items: [], total: 0 } }),
  apiPost: jest.fn().mockResolvedValue({ ok: true, value: {} }),
  apiPut: jest.fn().mockResolvedValue({ ok: true, value: {} }),
  apiPatch: jest.fn().mockResolvedValue({ ok: true, value: {} }),
  apiDelete: jest.fn().mockResolvedValue({ ok: true, value: {} }),
}));

jest.mock('../../infra/subscription/subscription-api', () => ({
  subscriptionApi: {
    getMySubscription: jest.fn(),
  },
}));

import { RootNavigator } from '../../presentation/navigation/RootNavigator';
import { ok } from '../../domain/common/result';
import * as dashboardApi from '../../infra/dashboard/dashboard-api';

const mockGetOwnerDashboard = dashboardApi.getOwnerDashboard as jest.Mock;

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    phase: 'unauthenticated' as AuthPhase,
    user: null,
    subscription: null,
    login: jest.fn().mockResolvedValue(null),
    signup: jest.fn().mockResolvedValue(null),
    setupAcademy: jest.fn().mockResolvedValue(null),
    logout: jest.fn(),
    refreshSubscription: jest.fn(),
    forceUpdate: null,
    ...overrides,
  };
}

function renderWithAuth(authValue: AuthContextValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <RootNavigator />
    </AuthContext.Provider>,
  );
}

const ownerUser = {
  id: 'u1',
  fullName: 'Owner',
  email: 'o@test.com',
  phoneNumber: '+919876543210',
  role: 'OWNER' as const,
  status: 'ACTIVE' as const,
};

const trialSubscription: SubscriptionInfo = {
  status: 'TRIAL',
  trialEndAt: '2026-04-01T00:00:00Z',
  paidEndAt: null,
  tierKey: null,
  daysRemaining: 29,
  canAccessApp: true,
  blockReason: null,
  activeStudentCount: 10,
  currentTierKey: null,
  requiredTierKey: 'TIER_0_50',
  pendingTierChange: null,
  tiers: [],
};

describe('Mobile Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Step 1: Unauthenticated → Login screen', () => {
    it('should show login screen when unauthenticated', () => {
      renderWithAuth(makeAuthValue({ phase: 'unauthenticated' }));
      expect(screen.getByText('Academyflo')).toBeTruthy();
      expect(screen.getByText('Sign in to continue')).toBeTruthy();
    });
  });

  describe('Step 2: Initializing → Loading', () => {
    it('should show loading overlay during initialization', () => {
      renderWithAuth(makeAuthValue({ phase: 'initializing' }));
      expect(screen.getByText('Starting Academyflo...')).toBeTruthy();
    });
  });

  describe('Step 3: Ready (Owner) → Dashboard', () => {
    it('should show owner dashboard with KPIs', async () => {
      mockGetOwnerDashboard.mockResolvedValue(
        ok({
          totalStudents: 45,
          newAdmissions: 5,
          inactiveStudents: 2,
          pendingPaymentRequests: 3,
          totalCollected: 12000,
          totalPendingAmount: 5000,
          todayAbsentCount: 2,
          dueStudentsCount: 0,
          todayPresentCount: 43,
          totalExpenses: 0,
        }),
      );

      renderWithAuth(
        makeAuthValue({
          phase: 'ready',
          user: ownerUser,
          subscription: trialSubscription,
        }),
      );

      await waitFor(() => {
        expect(screen.getByTestId('kpi-container')).toBeTruthy();
      });

      expect(screen.getByText('45')).toBeTruthy();
    });
  });

  describe('Step 4: Blocked subscription', () => {
    it('should show blocked screen when subscription expired', () => {
      renderWithAuth(
        makeAuthValue({
          phase: 'blocked',
          user: ownerUser,
          subscription: {
            ...trialSubscription,
            status: 'BLOCKED' as const,
            canAccessApp: false,
            blockReason: 'Trial expired',
            daysRemaining: 0,
          },
        }),
      );

      expect(screen.getByText('Trial expired')).toBeTruthy();
    });
  });

  describe('Step 5: Academy setup', () => {
    it('should show academy setup for new owner', () => {
      renderWithAuth(
        makeAuthValue({
          phase: 'needsAcademySetup',
          user: ownerUser,
        }),
      );

      expect(screen.getByText('Set Up Your Academy')).toBeTruthy();
    });
  });

  describe('Step 6: Staff role', () => {
    it('should show staff tabs without Dashboard', () => {
      renderWithAuth(
        makeAuthValue({
          phase: 'ready',
          user: {
            id: 'u2',
            fullName: 'Staff',
            email: 's@test.com',
            phoneNumber: '+919876543211',
            role: 'STAFF',
            status: 'ACTIVE',
          },
          subscription: {
            ...trialSubscription,
            status: 'ACTIVE_PAID' as const,
            paidEndAt: '2026-12-31T00:00:00Z',
            tierKey: 'TIER_0_50' as const,
            currentTierKey: 'TIER_0_50' as const,
          },
        }),
      );

      expect(screen.queryByText('Dashboard')).toBeNull();
      expect(screen.getByText('Attendance')).toBeTruthy();
    });
  });
});
