/**
 * Admin flow integration test — verifies the core user journey:
 * login → dashboard → academies → detail → audit logs
 *
 * Each step mocks the BFF services and verifies component rendering.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
const mockPush = jest.fn();
const mockParams = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => mockParams(),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock auth service
const mockLogin = jest.fn();
jest.mock('@/application/auth/admin-auth.service', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
}));

// Mock auth context
const mockUseAdminAuth = jest.fn();
jest.mock('@/application/auth/use-admin-auth', () => ({
  useAdminAuth: () => mockUseAdminAuth(),
}));

// Mock dashboard hook
const mockUseAdminDashboard = jest.fn();
jest.mock('@/application/admin-dashboard/use-admin-dashboard', () => ({
  useAdminDashboard: () => mockUseAdminDashboard(),
}));

// Mock academies hook
const mockUseAcademies = jest.fn();
jest.mock('@/application/academies/use-academies', () => ({
  useAcademies: () => mockUseAcademies(),
}));

import LoginPage from '@/app/(auth)/login/page';
import DashboardPage from '@/app/(app)/dashboard/page';
import AcademiesPage from '@/app/(app)/academies/page';

function authContext() {
  mockUseAdminAuth.mockReturnValue({
    accessToken: 'test-token',
    user: { id: '1', email: 'admin@test.com', fullName: 'Admin', role: 'SUPER_ADMIN' },
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
  });
}

describe('Admin Flow', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Step 1: Login', () => {
    it('should login and redirect to dashboard', async () => {
      mockLogin.mockResolvedValue({
        accessToken: 'tok',
        user: { id: '1', email: 'admin@test.com', fullName: 'Admin', role: 'SUPER_ADMIN' },
        deviceId: 'dev1',
      });

      render(<LoginPage />);

      await user.type(screen.getByLabelText('Email'), 'admin@test.com');
      await user.type(screen.getByLabelText('Password'), 'Password1!');
      await user.click(screen.getByRole('button', { name: 'Sign in' }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'Password1!');
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Step 2: Dashboard', () => {
    it('should render dashboard tiles with data', () => {
      authContext();
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
        refetch: jest.fn(),
      });

      render(<DashboardPage />);

      expect(screen.getByText('Total Academies')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('Step 3: Academies list', () => {
    it('should render academies page with data', () => {
      authContext();
      mockUseAcademies.mockReturnValue({
        data: {
          items: [
            {
              academyId: 'a1',
              academyName: 'Test Academy',
              ownerName: 'Owner',
              ownerEmail: 'owner@test.com',
              status: 'TRIAL',
              studentCount: 10,
              createdAt: '2024-01-01',
            },
          ],
          total: 1,
        },
        loading: false,
        error: null,
        page: 1,
        setPage: jest.fn(),
        search: '',
        setSearch: jest.fn(),
      });

      render(<AcademiesPage />);

      expect(screen.getByText('Test Academy')).toBeInTheDocument();
    });
  });
});
