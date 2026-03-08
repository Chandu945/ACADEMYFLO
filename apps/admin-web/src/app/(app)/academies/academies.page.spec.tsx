import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
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

// Mock academies hook
const mockRefetch = jest.fn();
const mockUseAcademies = jest.fn();
jest.mock('@/application/academies/use-academies', () => ({
  useAcademies: (...args: unknown[]) => mockUseAcademies(...args),
}));

import AcademiesPage from './page';

const sampleData = {
  items: [
    {
      academyId: 'a1',
      academyName: 'Test Academy',
      ownerName: 'John Doe',
      ownerEmail: 'john@test.com',
      ownerPhone: '+919876543210',
      status: 'TRIAL' as const,
      tierKey: null,
      activeStudentCount: 15,
      staffCount: 2,
      thisMonthRevenueTotal: null,
      createdAt: '2026-01-15T00:00:00.000Z',
    },
    {
      academyId: 'a2',
      academyName: 'Pro Academy',
      ownerName: 'Jane Smith',
      ownerEmail: 'jane@test.com',
      ownerPhone: null,
      status: 'ACTIVE_PAID' as const,
      tierKey: 'TIER_51_100' as const,
      activeStudentCount: 75,
      staffCount: 5,
      thisMonthRevenueTotal: 12500,
      createdAt: '2026-02-01T00:00:00.000Z',
    },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
};

describe('AcademiesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders column headings', () => {
    mockUseAcademies.mockReturnValue({
      data: sampleData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AcademiesPage />);

    expect(screen.getByText('Academy Name')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getAllByText('Status').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tier').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Students')).toBeInTheDocument();
    expect(screen.getByText('Staff')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
  });

  it('renders rows with academy data including optional fields', () => {
    mockUseAcademies.mockReturnValue({
      data: sampleData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AcademiesPage />);

    expect(screen.getByText('Test Academy')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@test.com')).toBeInTheDocument();
    expect(screen.getByText('+919876543210')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Pro Academy')).toBeInTheDocument();
    expect(screen.getByText('51\u2013100')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('\u20B912,500')).toBeInTheDocument();
  });

  it('shows dashes for missing optional data', () => {
    const dataWithNulls = {
      items: [
        {
          academyId: 'a1',
          academyName: 'Basic',
          ownerName: 'Owner',
          ownerEmail: 'owner@test.com',
          ownerPhone: null,
          status: 'TRIAL' as const,
          tierKey: null,
          activeStudentCount: null,
          staffCount: null,
          thisMonthRevenueTotal: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    };

    mockUseAcademies.mockReturnValue({
      data: dataWithNulls,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AcademiesPage />);

    // Phone, Tier, Students, Staff, Revenue should all show dashes
    const dashes = screen.getAllByText('\u2014');
    expect(dashes.length).toBeGreaterThanOrEqual(5);
  });

  it('renders empty state when no academies', () => {
    mockUseAcademies.mockReturnValue({
      data: { items: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AcademiesPage />);

    expect(screen.getByText('No academies found')).toBeInTheDocument();
  });

  it('renders error alert with retry', async () => {
    const user = userEvent.setup();
    mockUseAcademies.mockReturnValue({
      data: null,
      loading: false,
      error: { code: 'UNKNOWN', message: 'Server error' },
      refetch: mockRefetch,
    });

    render(<AcademiesPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Server error');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders View links for each academy', () => {
    mockUseAcademies.mockReturnValue({
      data: sampleData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AcademiesPage />);

    const viewLinks = screen.getAllByText('View');
    expect(viewLinks).toHaveLength(2);
  });

  it('renders pagination with total count', () => {
    mockUseAcademies.mockReturnValue({
      data: sampleData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AcademiesPage />);

    expect(screen.getByText('2 academies')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });
});
