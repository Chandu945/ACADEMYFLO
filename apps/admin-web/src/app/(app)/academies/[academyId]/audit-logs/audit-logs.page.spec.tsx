import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
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

// Mock audit logs hook
const mockRefetch = jest.fn();
const mockUseAuditLogs = jest.fn();
jest.mock('@/application/audit-logs/use-audit-logs', () => ({
  useAuditLogs: (...args: unknown[]) => mockUseAuditLogs(...args),
}));

import AuditLogsPage from './page';

const sampleData = {
  items: [
    {
      id: 'log1',
      occurredAt: '2026-03-01T10:00:00.000Z',
      actor: { userId: 'u1', role: 'OWNER', name: 'John Doe' },
      actionType: 'STUDENT_CREATED',
      entity: { type: 'STUDENT', id: 's1' },
      context: { month: '2026-03' },
    },
    {
      id: 'log2',
      occurredAt: '2026-03-02T14:30:00.000Z',
      actor: { userId: 'u2', role: 'STAFF', name: null },
      actionType: 'STUDENT_ATTENDANCE_EDITED',
      entity: { type: 'STUDENT_ATTENDANCE', id: null },
      context: { date: '2026-03-02', count: 5 },
    },
  ],
  meta: { page: 1, pageSize: 50, totalItems: 2, totalPages: 1 },
};

describe('AuditLogsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table column headings', () => {
    mockUseAuditLogs.mockReturnValue({
      data: sampleData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AuditLogsPage />);

    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Actor')).toBeInTheDocument();
    expect(screen.getByText('Entity')).toBeInTheDocument();
    expect(screen.getByText('Context')).toBeInTheDocument();
  });

  it('renders audit log rows', () => {
    mockUseAuditLogs.mockReturnValue({
      data: sampleData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AuditLogsPage />);

    // Action text also appears in filter dropdown options, so use getAllByText
    expect(screen.getAllByText('STUDENT CREATED').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('STUDENT ATTENDANCE EDITED').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('OWNER: John Doe')).toBeInTheDocument();
    expect(screen.getByText('STUDENT s1')).toBeInTheDocument();
  });

  it('renders empty state when no items', () => {
    mockUseAuditLogs.mockReturnValue({
      data: { items: [], meta: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 } },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AuditLogsPage />);

    expect(screen.getByText('No audit logs found for the selected filters.')).toBeInTheDocument();
  });

  it('renders error alert with retry', async () => {
    const user = userEvent.setup();
    mockUseAuditLogs.mockReturnValue({
      data: null,
      loading: false,
      error: { code: 'UNKNOWN', message: 'Server error' },
      refetch: mockRefetch,
    });

    render(<AuditLogsPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Server error');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders Apply and Clear filter buttons', () => {
    mockUseAuditLogs.mockReturnValue({
      data: sampleData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AuditLogsPage />);

    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  });

  it('renders pagination with entry count', () => {
    mockUseAuditLogs.mockReturnValue({
      data: sampleData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AuditLogsPage />);

    expect(screen.getByText('2 entries')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });

  it('renders back link to academy detail', () => {
    mockUseAuditLogs.mockReturnValue({
      data: sampleData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AuditLogsPage />);

    const backLink = screen.getByRole('link', { name: /back to academy/i });
    expect(backLink).toHaveAttribute('href', '/academies/a1');
  });

  it('Apply button triggers URL update', async () => {
    const user = userEvent.setup();
    mockUseAuditLogs.mockReturnValue({
      data: sampleData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AuditLogsPage />);

    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(mockPush).toHaveBeenCalled();
  });

  it('Clear button resets URL', async () => {
    const user = userEvent.setup();
    mockUseAuditLogs.mockReturnValue({
      data: sampleData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AuditLogsPage />);

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(mockPush).toHaveBeenCalledWith('/academies/a1/audit-logs');
  });
});
