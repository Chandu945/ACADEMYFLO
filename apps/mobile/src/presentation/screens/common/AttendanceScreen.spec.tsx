import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

import { AttendanceScreen } from './AttendanceScreen';
import * as attendanceApi from '../../../infra/attendance/attendance-api';
import { ok, err } from '../../../domain/common/result';

jest.mock('../../../infra/attendance/attendance-api', () => ({
  getDailyAttendance: jest.fn(),
  markAttendance: jest.fn(),
  bulkSetAbsences: jest.fn(),
  getDailyReport: jest.fn(),
  getMonthlySummary: jest.fn(),
  getStudentMonthlyDetail: jest.fn(),
}));

jest.mock('../../../infra/attendance/holidays-api', () => ({
  declareHoliday: jest.fn(),
  removeHoliday: jest.fn(),
  getHolidays: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'OWNER' } }),
}));

const mockGetDaily = attendanceApi.getDailyAttendance as jest.Mock;
const mockMarkAttendance = attendanceApi.markAttendance as jest.Mock;

function makeDailyResponse(
  items = [
    { studentId: 's1', fullName: 'Student One', status: 'PRESENT' },
    { studentId: 's2', fullName: 'Student Two', status: 'ABSENT' },
  ],
  isHoliday = false,
) {
  return {
    date: '2026-03-04',
    isHoliday,
    data: items,
    meta: { page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 },
  };
}

describe('AttendanceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows skeleton on load', async () => {
    let resolvePromise: (v: unknown) => void;
    const pending = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockGetDaily.mockReturnValue(pending);

    render(<AttendanceScreen />);

    expect(screen.getByTestId('skeleton-container')).toBeTruthy();

    await act(async () => {
      resolvePromise!(ok(makeDailyResponse()));
    });
  });

  it('renders attendance rows on success', async () => {
    mockGetDaily.mockResolvedValue(ok(makeDailyResponse()));

    render(<AttendanceScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('attendance-row-s1')).toBeTruthy();
      expect(screen.getByTestId('attendance-row-s2')).toBeTruthy();
    });

    expect(screen.getByText('Student One')).toBeTruthy();
    expect(screen.getByText('Student Two')).toBeTruthy();
  });

  it('shows holiday banner when isHoliday is true', async () => {
    mockGetDaily.mockResolvedValue(ok(makeDailyResponse([], true)));

    render(<AttendanceScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('holiday-banner')).toBeTruthy();
    });
  });

  it('toggles attendance status optimistically', async () => {
    mockGetDaily.mockResolvedValue(ok(makeDailyResponse()));
    mockMarkAttendance.mockResolvedValue(
      ok({ studentId: 's1', date: '2026-03-04', status: 'ABSENT' }),
    );

    render(<AttendanceScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('toggle-s1')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('toggle-s1'));

    expect(mockMarkAttendance).toHaveBeenCalledWith('s1', expect.any(String), 'ABSENT');
  });

  it('shows error with retry on API failure', async () => {
    mockGetDaily.mockResolvedValue(
      err({ code: 'NETWORK', message: 'Network error. Please check your connection.' }),
    );

    render(<AttendanceScreen />);

    await waitFor(() => {
      expect(screen.getByText('Network error. Please check your connection.')).toBeTruthy();
    });

    expect(screen.getByTestId('retry-button')).toBeTruthy();
  });

  it('navigates to daily report', async () => {
    mockGetDaily.mockResolvedValue(ok(makeDailyResponse()));

    render(<AttendanceScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('daily-report-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('daily-report-button'));

    expect(mockNavigate).toHaveBeenCalledWith('DailyReport', {
      date: expect.any(String),
    });
  });
});
