/**
 * Navigation regression tests — ensures each AuthPhase maps to
 * the correct navigator/screen and phase transitions are handled.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text: T } = require('react-native');
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }: { children: unknown }) =>
        R.createElement(R.Fragment, null, children),
      Screen: ({ name }: { name: string }) => R.createElement(T, null, name),
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

jest.mock('../../infra/http/api-client', () => ({
  accessTokenStore: { value: null },
  registerAuthFailureHandler: jest.fn(),
  apiGet: jest.fn().mockResolvedValue({ ok: true, value: {} }),
  apiPost: jest.fn().mockResolvedValue({ ok: true, value: {} }),
  apiPut: jest.fn().mockResolvedValue({ ok: true, value: {} }),
  apiPatch: jest.fn().mockResolvedValue({ ok: true, value: {} }),
  apiDelete: jest.fn().mockResolvedValue({ ok: true, value: {} }),
}));

jest.mock('../../infra/dashboard/dashboard-api', () => ({
  getOwnerDashboard: jest.fn().mockResolvedValue({ ok: true, value: {} }),
}));

import { RootNavigator } from '../../presentation/navigation/RootNavigator';

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

const staffUser = {
  id: 'u2',
  fullName: 'Staff',
  email: 's@test.com',
  phoneNumber: '+919876543211',
  role: 'STAFF' as const,
  status: 'ACTIVE' as const,
};

const activeSub: SubscriptionInfo = {
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

describe('Navigation Regression', () => {
  describe('Phase → Screen mapping', () => {
    it('initializing → LoadingOverlay', () => {
      renderWithAuth(makeAuthValue({ phase: 'initializing' }));
      expect(screen.getByText('Starting Academyflo...')).toBeTruthy();
    });

    it('unauthenticated → AuthStack (Login)', () => {
      renderWithAuth(makeAuthValue({ phase: 'unauthenticated' }));
      expect(screen.getByText('Sign in to continue')).toBeTruthy();
    });

    it('needsAcademySetup → AcademySetupScreen', () => {
      renderWithAuth(makeAuthValue({ phase: 'needsAcademySetup', user: ownerUser }));
      expect(screen.getByText('Set Up Your Academy')).toBeTruthy();
    });

    it('blocked → BlockedStack', () => {
      renderWithAuth(
        makeAuthValue({
          phase: 'blocked',
          user: ownerUser,
          subscription: {
            ...activeSub,
            status: 'BLOCKED' as const,
            canAccessApp: false,
            blockReason: 'Subscription expired',
            daysRemaining: 0,
          },
        }),
      );
      expect(screen.getByText('Subscription expired')).toBeTruthy();
    });

    it('ready + OWNER → OwnerTabs (has Dashboard)', () => {
      renderWithAuth(
        makeAuthValue({
          phase: 'ready',
          user: ownerUser,
          subscription: activeSub,
        }),
      );
      expect(screen.getByText('Dashboard')).toBeTruthy();
    });

    it('ready + STAFF → StaffTabs (no Dashboard)', () => {
      renderWithAuth(
        makeAuthValue({
          phase: 'ready',
          user: staffUser,
          subscription: {
            ...activeSub,
            status: 'ACTIVE_PAID' as const,
            paidEndAt: '2026-12-31T00:00:00Z',
            tierKey: 'TIER_0_50' as const,
            currentTierKey: 'TIER_0_50' as const,
          },
        }),
      );
      // Staff now has a Dashboard tab
      expect(screen.getByText('Dashboard')).toBeTruthy();
      expect(screen.getByText('Attendance')).toBeTruthy();
    });
  });

  describe('Phase transitions', () => {
    it('re-renders correctly when phase changes from initializing to unauthenticated', () => {
      const auth = makeAuthValue({ phase: 'initializing' });
      const { rerender } = renderWithAuth(auth);

      expect(screen.getByText('Starting Academyflo...')).toBeTruthy();

      rerender(
        <AuthContext.Provider value={{ ...auth, phase: 'unauthenticated' }}>
          <RootNavigator />
        </AuthContext.Provider>,
      );

      expect(screen.getByText('Sign in to continue')).toBeTruthy();
    });

    it('re-renders correctly when phase changes from unauthenticated to ready', () => {
      const auth = makeAuthValue({ phase: 'unauthenticated' });
      const { rerender } = renderWithAuth(auth);

      expect(screen.getByText('Sign in to continue')).toBeTruthy();

      rerender(
        <AuthContext.Provider
          value={{ ...auth, phase: 'ready', user: ownerUser, subscription: activeSub }}
        >
          <RootNavigator />
        </AuthContext.Provider>,
      );

      expect(screen.getByText('Dashboard')).toBeTruthy();
    });

    it('re-renders from ready to blocked when subscription expires', () => {
      const auth = makeAuthValue({
        phase: 'ready',
        user: ownerUser,
        subscription: activeSub,
      });
      const { rerender } = renderWithAuth(auth);

      expect(screen.getByText('Dashboard')).toBeTruthy();

      rerender(
        <AuthContext.Provider
          value={{
            ...auth,
            phase: 'blocked',
            subscription: {
              ...activeSub,
              status: 'BLOCKED' as const,
              canAccessApp: false,
              blockReason: 'Payment overdue',
              daysRemaining: 0,
            },
          }}
        >
          <RootNavigator />
        </AuthContext.Provider>,
      );

      expect(screen.getByText('Payment overdue')).toBeTruthy();
    });
  });

  describe('Unknown/default phase', () => {
    it('falls back to AuthStack for unknown phase', () => {
      renderWithAuth(makeAuthValue({ phase: 'anything-unknown' as AuthPhase }));
      expect(screen.getByText('Sign in to continue')).toBeTruthy();
    });
  });
});
