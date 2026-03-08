import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { StaffListScreen } from './StaffListScreen';
import * as staffApi from '../../../infra/staff/staff-api';
import { ok, err } from '../../../domain/common/result';

jest.mock('../../../infra/staff/staff-api', () => ({
  listStaff: jest.fn(),
  createStaff: jest.fn(),
  updateStaff: jest.fn(),
  setStaffStatus: jest.fn(),
  staffApi: {},
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const mockListStaff = staffApi.listStaff as jest.Mock;
const mockSetStaffStatus = staffApi.setStaffStatus as jest.Mock;

function makeStaff(overrides = {}) {
  return {
    id: 's1',
    fullName: 'Priya Sharma',
    email: 'priya@example.com',
    phoneNumber: '+919876543211',
    role: 'STAFF',
    status: 'ACTIVE',
    academyId: 'a1',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
    ...overrides,
  };
}

function mockListResponse(items = [makeStaff()]) {
  return ok({
    data: items,
    meta: { page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 },
  });
}

describe('StaffListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows skeleton on initial load', async () => {
    let resolvePromise: (v: unknown) => void;
    const pending = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockListStaff.mockReturnValue(pending);

    render(<StaffListScreen />);

    expect(screen.getByTestId('skeleton-container')).toBeTruthy();

    await act(async () => {
      resolvePromise!(mockListResponse());
    });
  });

  it('renders staff rows after load', async () => {
    mockListStaff.mockResolvedValue(mockListResponse());

    render(<StaffListScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('staff-row-s1')).toBeTruthy();
    });

    expect(screen.getByText('Priya Sharma')).toBeTruthy();
    expect(screen.getByText('priya@example.com')).toBeTruthy();
  });

  it('shows empty state when no staff', async () => {
    mockListStaff.mockResolvedValue(mockListResponse([]));

    render(<StaffListScreen />);

    await waitFor(() => {
      expect(screen.getByText('No staff members')).toBeTruthy();
    });
  });

  it('shows error with retry on API failure', async () => {
    mockListStaff.mockResolvedValue(err({ code: 'NETWORK', message: 'Network error' }));

    render(<StaffListScreen />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeTruthy();
    });
  });

  it('toggle status triggers confirm and calls API', async () => {
    mockListStaff.mockResolvedValue(mockListResponse());
    mockSetStaffStatus.mockResolvedValue(ok({}));

    render(<StaffListScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('toggle-status-s1')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('toggle-status-s1'));

    await waitFor(() => {
      expect(screen.getByTestId('status-confirm')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-ok'));
    });

    await waitFor(() => {
      expect(mockSetStaffStatus).toHaveBeenCalledWith('s1', { status: 'INACTIVE' });
    });
  });

  it('has add staff button', async () => {
    mockListStaff.mockResolvedValue(mockListResponse());

    render(<StaffListScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('add-staff-fab')).toBeTruthy();
    });
  });
});
