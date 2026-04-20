import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MoreScreen } from './MoreScreen';
import { AuthContext } from '../../context/AuthContext';
import type { AuthContextValue, AuthPhase } from '../../context/AuthContext';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Auto-confirm the destructive option in crossAlert so logout flows through in tests.
jest.mock('../../utils/crossPlatformAlert', () => ({
  crossAlert: (_title: string, _msg?: string, buttons?: Array<{ style?: string; onPress?: () => void }>) => {
    const destructive = buttons?.find((b) => b.style === 'destructive');
    destructive?.onPress?.();
  },
}));

function makeAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    phase: 'ready' as AuthPhase,
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
      daysRemaining: 28,
      canAccessApp: true,
      blockReason: null,
      activeStudentCount: 10,
      currentTierKey: null,
      requiredTierKey: 'TIER_0_50',
      pendingTierChange: null,
      tiers: [],
      pendingPaymentOrderId: null,
    },
    login: jest.fn().mockResolvedValue(null),
    signup: jest.fn().mockResolvedValue(null),
    setupAcademy: jest.fn().mockResolvedValue(null),
    logout: jest.fn(),
    refreshSubscription: jest.fn(),
    forceUpdate: null,
    ...overrides,
  };
}

function renderScreen(auth: AuthContextValue) {
  return render(
    <AuthContext.Provider value={auth}>
      <MoreScreen />
    </AuthContext.Provider>,
  );
}

describe('MoreScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and menu items for owner', () => {
    renderScreen(makeAuth());
    expect(screen.getByTestId('more-title')).toBeTruthy();
    expect(screen.getByTestId('menu-academy-settings')).toBeTruthy();
    expect(screen.getByTestId('menu-subscription')).toBeTruthy();
    expect(screen.getByTestId('menu-batches')).toBeTruthy();
    expect(screen.getByTestId('menu-staff')).toBeTruthy();
    expect(screen.getByTestId('menu-reports')).toBeTruthy();
  });

  it('navigates to AcademySettings on press', () => {
    renderScreen(makeAuth());
    fireEvent.press(screen.getByTestId('menu-academy-settings'));
    expect(mockNavigate).toHaveBeenCalledWith('AcademySettings');
  });

  it('navigates to BatchesList on press', () => {
    renderScreen(makeAuth());
    fireEvent.press(screen.getByTestId('menu-batches'));
    expect(mockNavigate).toHaveBeenCalledWith('BatchesList');
  });

  it('calls logout on sign out press', () => {
    const logoutMock = jest.fn();
    renderScreen(makeAuth({ logout: logoutMock }));
    fireEvent.press(screen.getByTestId('more-logout'));
    expect(logoutMock).toHaveBeenCalled();
  });

  it('shows Audit Logs menu for OWNER', () => {
    renderScreen(makeAuth());
    expect(screen.getByTestId('menu-audit-logs')).toBeTruthy();
  });

  it('navigates to AuditLogs on press', () => {
    renderScreen(makeAuth());
    fireEvent.press(screen.getByTestId('menu-audit-logs'));
    expect(mockNavigate).toHaveBeenCalledWith('AuditLogs');
  });

  it('hides owner-only items for STAFF', () => {
    renderScreen(
      makeAuth({
        user: {
          id: 'u2',
          fullName: 'Staff',
          email: 's@test.com',
          phoneNumber: '+919876543211',
          role: 'STAFF',
          status: 'ACTIVE',
        },
      }),
    );
    expect(screen.queryByTestId('menu-audit-logs')).toBeNull();
    expect(screen.queryByTestId('menu-staff')).toBeNull();
    expect(screen.queryByTestId('menu-reports')).toBeNull();
    expect(screen.queryByTestId('menu-expenses')).toBeNull();
    expect(screen.getByTestId('menu-batches')).toBeTruthy();
    expect(screen.getByTestId('menu-enquiries')).toBeTruthy();
    expect(screen.getByTestId('menu-events')).toBeTruthy();
  });

  it('shows parent-specific items for PARENT', () => {
    renderScreen(
      makeAuth({
        user: {
          id: 'u3',
          fullName: 'Parent',
          email: 'p@test.com',
          phoneNumber: '+919876543212',
          role: 'PARENT',
          status: 'ACTIVE',
        },
      }),
    );
    expect(screen.getByTestId('menu-parent-profile')).toBeTruthy();
    expect(screen.getByTestId('menu-academy-info')).toBeTruthy();
    expect(screen.getByTestId('menu-payment-history')).toBeTruthy();
    expect(screen.queryByTestId('menu-batches')).toBeNull();
    expect(screen.queryByTestId('menu-staff')).toBeNull();
  });
});
