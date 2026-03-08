import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock auth context
jest.mock('@/application/auth/use-admin-auth', () => ({
  useAdminAuth: () => ({
    accessToken: 'test-token',
    user: { id: '1', email: 'admin@test.com', fullName: 'Admin', role: 'SUPER_ADMIN' },
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Mock dashboard hook
const mockRefetch = jest.fn();
const mockUseAdminDashboard = jest.fn();
jest.mock('@/application/admin-dashboard/use-admin-dashboard', () => ({
  useAdminDashboard: () => mockUseAdminDashboard(),
}));

import DashboardPage from './page';

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders skeleton tiles while loading', () => {
    mockUseAdminDashboard.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<DashboardPage />);

    expect(screen.getByLabelText('Loading dashboard')).toBeInTheDocument();
  });

  it('renders tiles with correct labels and counts on success', () => {
    mockUseAdminDashboard.mockReturnValue({
      data: {
        totalAcademies: 42,
        activeTrials: 8,
        activePaid: 30,
        expiredGrace: 0,
        disabled: 4,
        blocked: 4,
      },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<DashboardPage />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Total Academies')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Active Trials')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('Active Paid')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('renders accessible tile aria-labels', () => {
    mockUseAdminDashboard.mockReturnValue({
      data: {
        totalAcademies: 10,
        activeTrials: 3,
        activePaid: 5,
        expiredGrace: 0,
        disabled: 2,
        blocked: 2,
      },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<DashboardPage />);

    expect(screen.getByLabelText('Total Academies: 10')).toBeInTheDocument();
    expect(screen.getByLabelText('Active Trials: 3')).toBeInTheDocument();
  });

  it('renders error alert and retry button on failure', async () => {
    const user = userEvent.setup();
    mockUseAdminDashboard.mockReturnValue({
      data: null,
      loading: false,
      error: { code: 'UNKNOWN', message: 'Server error' },
      refetch: mockRefetch,
    });

    render(<DashboardPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Server error');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalled();
  });
});
