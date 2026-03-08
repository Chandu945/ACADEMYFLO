import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { DashboardScreen } from './DashboardScreen';
import * as dashboardApi from '../../../infra/dashboard/dashboard-api';
import { ok, err } from '../../../domain/common/result';

jest.mock('../../../infra/dashboard/dashboard-api', () => ({
  getOwnerDashboard: jest.fn(),
}));

const mockGetOwnerDashboard = dashboardApi.getOwnerDashboard as jest.Mock;

function makeKpis(overrides = {}) {
  return {
    totalStudents: 45,
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
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
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

  it('switches to date range filter and validates', async () => {
    mockGetOwnerDashboard.mockResolvedValue(ok(makeKpis()));

    render(<DashboardScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('kpi-container')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('filter-date-range'));

    expect(screen.getByTestId('input-from')).toBeTruthy();
    expect(screen.getByTestId('input-to')).toBeTruthy();

    const applyButton = screen.getByTestId('apply-button');
    expect(
      applyButton.props.accessibilityState?.disabled ?? applyButton.props.disabled,
    ).toBeTruthy();
  });

  it('enables Apply when valid dates are entered', async () => {
    mockGetOwnerDashboard.mockResolvedValue(ok(makeKpis()));

    render(<DashboardScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('kpi-container')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('filter-date-range'));
    fireEvent.changeText(screen.getByTestId('input-from'), '2026-01-01');
    fireEvent.changeText(screen.getByTestId('input-to'), '2026-01-31');

    const applyButton = screen.getByTestId('apply-button');
    expect(
      applyButton.props.accessibilityState?.disabled ?? applyButton.props.disabled,
    ).toBeFalsy();
  });
});
