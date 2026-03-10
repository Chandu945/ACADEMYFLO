import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { DashboardScreen } from './DashboardScreen';
import * as dashboardApi from '../../../infra/dashboard/dashboard-api';
import { ok, err } from '../../../domain/common/result';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

jest.mock('../../../infra/dashboard/dashboard-api', () => ({
  getOwnerDashboard: jest.fn(),
  getMonthlyChart: jest.fn().mockResolvedValue({ ok: true, value: { data: [] } }),
  getBirthdays: jest.fn().mockResolvedValue({ ok: true, value: { students: [] } }),
}));

jest.mock('../../../infra/event/event-api', () => ({
  getEventSummary: jest.fn().mockResolvedValue({ ok: true, value: { thisMonth: { total: 0, upcoming: 0 }, nextMonth: { total: 0, upcoming: 0 } } }),
}));

jest.mock('../../../infra/enquiry/enquiry-api', () => ({
  getEnquirySummary: jest.fn().mockResolvedValue({ ok: true, value: { total: 0, open: 0, converted: 0, closed: 0 } }),
}));

const mockGetOwnerDashboard = dashboardApi.getOwnerDashboard as jest.Mock;

function makeKpis(overrides = {}) {
  return {
    totalStudents: 45,
    newAdmissions: 5,
    inactiveStudents: 7,
    pendingPaymentRequests: 3,
    totalCollected: 12000,
    totalPendingAmount: 5000,
    todayAbsentCount: 2,
    dueStudentsCount: 0,
    todayPresentCount: 43,
    totalExpenses: 0,
    ...overrides,
  };
}

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows skeleton tiles while loading', async () => {
    let resolvePromise: (v: unknown) => void;
    const pending = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockGetOwnerDashboard.mockReturnValue(pending);

    render(<DashboardScreen />);

    expect(screen.getByTestId('skeleton-container')).toBeTruthy();

    await act(async () => {
      resolvePromise!(ok(makeKpis()));
    });
  });

  it('shows KPI tiles with correct values on success', async () => {
    mockGetOwnerDashboard.mockResolvedValue(ok(makeKpis()));

    render(<DashboardScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('kpi-container')).toBeTruthy();
    });

    expect(screen.getByText('45')).toBeTruthy();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  it('shows error with retry on API failure', async () => {
    mockGetOwnerDashboard.mockResolvedValue(
      err({ code: 'NETWORK', message: 'Network error. Please check your connection.' }),
    );

    render(<DashboardScreen />);

    await waitFor(() => {
      expect(screen.getByText('Network error. Please check your connection.')).toBeTruthy();
    });

    expect(screen.getByTestId('retry-button')).toBeTruthy();
  });
});
