import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ academyId: 'a1' }),
}));

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

// Mock toast
jest.mock('@/components/ui/ToastHost', () => ({
  useToast: () => ({ show: jest.fn(), dismiss: jest.fn() }),
}));

// Mock detail hook
const mockRefetch = jest.fn();
const mockActions = {
  setManualSubscription: jest.fn().mockResolvedValue({ ok: true }),
  deactivateSubscription: jest.fn().mockResolvedValue({ ok: true }),
  setLoginDisabled: jest.fn().mockResolvedValue({ ok: true }),
  forceLogout: jest.fn().mockResolvedValue({ ok: true }),
  resetOwnerPassword: jest.fn().mockResolvedValue({
    ok: true,
    data: { temporaryPassword: 'TempPass1!' },
  }),
};
const mockUseAcademyDetail = jest.fn();
jest.mock('@/application/academy-detail/use-academy-detail', () => ({
  useAcademyDetail: (...args: unknown[]) => mockUseAcademyDetail(...args),
}));

import AcademyDetailPage from './page';

const sampleData = {
  academyId: 'a1',
  academyName: 'Test Academy',
  loginDisabled: false,
  owner: { fullName: 'John Doe', email: 'john@test.com', phoneNumber: '+919876543210' },
  subscription: {
    status: 'TRIAL' as const,
    tierKey: null,
    trialEndAt: '2026-02-01T00:00:00.000Z',
    paidStartAt: null,
    paidEndAt: null,
    manualNotes: null,
    paymentReference: null,
  },
  metrics: { activeStudentCount: 10, staffCount: 2, thisMonthRevenueTotal: 5000 },
};

describe('AcademyDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders academy header and metrics', () => {
    mockUseAcademyDetail.mockReturnValue({
      data: sampleData,
      loading: false,
      error: null,
      refetch: mockRefetch,
      actions: mockActions,
    });

    render(<AcademyDetailPage />);

    expect(screen.getByText('Test Academy')).toBeInTheDocument();
    expect(screen.getAllByText('TRIAL').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Active Students')).toBeInTheDocument();
  });

  it('renders owner info', () => {
    mockUseAcademyDetail.mockReturnValue({
      data: sampleData,
      loading: false,
      error: null,
      refetch: mockRefetch,
      actions: mockActions,
    });

    render(<AcademyDetailPage />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@test.com')).toBeInTheDocument();
    expect(screen.getByText('+919876543210')).toBeInTheDocument();
  });

  it('renders subscription info', () => {
    mockUseAcademyDetail.mockReturnValue({
      data: sampleData,
      loading: false,
      error: null,
      refetch: mockRefetch,
      actions: mockActions,
    });

    render(<AcademyDetailPage />);

    expect(screen.getByText('Subscription')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    mockUseAcademyDetail.mockReturnValue({
      data: sampleData,
      loading: false,
      error: null,
      refetch: mockRefetch,
      actions: mockActions,
    });

    render(<AcademyDetailPage />);

    expect(screen.getByText('Set Manual Subscription')).toBeInTheDocument();
    expect(screen.getByText('Deactivate Subscription')).toBeInTheDocument();
    expect(screen.getByText('Disable Login')).toBeInTheDocument();
    expect(screen.getByText('Force Logout All Users')).toBeInTheDocument();
    expect(screen.getByText('Reset Owner Password')).toBeInTheDocument();
  });

  it('renders error alert with retry', async () => {
    const user = userEvent.setup();
    mockUseAcademyDetail.mockReturnValue({
      data: null,
      loading: false,
      error: { code: 'UNKNOWN', message: 'Server error' },
      refetch: mockRefetch,
      actions: mockActions,
    });

    render(<AcademyDetailPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Server error');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders not found message for 404', () => {
    mockUseAcademyDetail.mockReturnValue({
      data: null,
      loading: false,
      error: { code: 'NOT_FOUND', message: 'Not found' },
      refetch: mockRefetch,
      actions: mockActions,
    });

    render(<AcademyDetailPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Academy not found');
  });

  it('opens deactivate confirm dialog on click', async () => {
    const user = userEvent.setup();
    mockUseAcademyDetail.mockReturnValue({
      data: sampleData,
      loading: false,
      error: null,
      refetch: mockRefetch,
      actions: mockActions,
    });

    render(<AcademyDetailPage />);

    await user.click(screen.getByText('Deactivate Subscription'));
    expect(screen.getByText('Deactivate')).toBeInTheDocument();
  });

  it('renders audit logs link', () => {
    mockUseAcademyDetail.mockReturnValue({
      data: sampleData,
      loading: false,
      error: null,
      refetch: mockRefetch,
      actions: mockActions,
    });

    render(<AcademyDetailPage />);

    const link = screen.getByRole('link', { name: /audit logs/i });
    expect(link).toHaveAttribute('href', '/academies/a1/audit-logs');
  });
});
