import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AuthContext } from '../context/AuthContext';
import type { AuthContextValue, AuthPhase } from '../context/AuthContext';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-image-picker', () => ({ launchImageLibrary: jest.fn() }));

jest.mock('@react-navigation/native-stack', () => {
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
  const R = require('react');
  const { Text: T } = require('react-native');
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }: { children: unknown }) =>
        R.createElement(R.Fragment, null, children),
      Screen: ({ name }: { name: string }) => R.createElement(T, null, name),
    }),
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { mode: 'create' } }),
  useFocusEffect: jest.fn(),
  NavigationContainer: ({ children }: { children: React.ReactNode }) =>
    require('react').createElement(require('react').Fragment, null, children),
}));

// Import after mocks
import { RootNavigator } from './RootNavigator';

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

describe('RootNavigator', () => {
  it('shows loading during initialization', () => {
    renderWithAuth(makeAuthValue({ phase: 'initializing' }));
    expect(screen.getByText('Starting PlayConnect...')).toBeTruthy();
  });

  it('shows Login screen when unauthenticated', () => {
    renderWithAuth(makeAuthValue({ phase: 'unauthenticated' }));
    expect(screen.getByText('PlayConnect')).toBeTruthy();
    expect(screen.getByText('Sign in to your account')).toBeTruthy();
  });

  it('shows blocked screen when subscription is blocked', () => {
    renderWithAuth(
      makeAuthValue({
        phase: 'blocked',
        user: {
          id: 'u1',
          fullName: 'Owner',
          email: 'o@test.com',
          phoneNumber: '+919876543210',
          role: 'OWNER',
          status: 'ACTIVE',
        },
        subscription: {
          status: 'BLOCKED',
          trialEndAt: '2026-03-01T00:00:00Z',
          paidEndAt: null,
          tierKey: null,
          daysRemaining: 0,
          canAccessApp: false,
          blockReason: 'Trial expired',
          activeStudentCount: 0,
          currentTierKey: null,
          requiredTierKey: 'TIER_0_50',
          pendingTierChange: null,
          tiers: [],
        },
      }),
    );
    expect(screen.getByText('Trial expired')).toBeTruthy();
    expect(screen.getByText('Status')).toBeTruthy();
  });

  it('shows Owner tabs for authenticated owner', () => {
    renderWithAuth(
      makeAuthValue({
        phase: 'ready',
        user: {
          id: 'u1',
          fullName: 'Owner',
          email: 'o@test.com',
          phoneNumber: '+919876543210',
          role: 'OWNER',
          status: 'ACTIVE',
        },
        subscription: {
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
        },
      }),
    );
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });

  it('shows Staff tabs for authenticated staff', () => {
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
          status: 'ACTIVE_PAID',
          trialEndAt: '2026-01-01T00:00:00Z',
          paidEndAt: '2026-12-31T00:00:00Z',
          tierKey: 'TIER_0_50',
          daysRemaining: 304,
          canAccessApp: true,
          blockReason: null,
          activeStudentCount: 25,
          currentTierKey: 'TIER_0_50',
          requiredTierKey: 'TIER_0_50',
          pendingTierChange: null,
          tiers: [],
        },
      }),
    );
    // Staff tabs don't have Dashboard
    expect(screen.queryByText('Dashboard')).toBeNull();
    expect(screen.getByText('Attendance')).toBeTruthy();
  });

  it('shows academy setup for needsAcademySetup phase', () => {
    renderWithAuth(
      makeAuthValue({
        phase: 'needsAcademySetup',
        user: {
          id: 'u1',
          fullName: 'Owner',
          email: 'o@test.com',
          phoneNumber: '+919876543210',
          role: 'OWNER',
          status: 'ACTIVE',
        },
      }),
    );
    expect(screen.getByText('Set Up Your Academy')).toBeTruthy();
  });
});
