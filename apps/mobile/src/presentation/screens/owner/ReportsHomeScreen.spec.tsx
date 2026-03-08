import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react-native';
import { ReportsHomeScreen } from './ReportsHomeScreen';
import * as reportsApi from '../../../infra/reports/reports-api';
import { ok, err } from '../../../domain/common/result';

jest.mock('../../../infra/reports/reports-api', () => ({
  getMonthlyRevenue: jest.fn(),
  getStudentWiseDues: jest.fn(),
  getRevenueExportUrl: jest.fn((m: string) => `/api/v1/reports/revenue/export.pdf?month=${m}`),
  getPendingDuesExportUrl: jest.fn(
    (m: string) => `/api/v1/reports/dues/pending/export.pdf?month=${m}`,
  ),
  reportsApi: {},
  pdfDownload: { downloadAndStorePdf: jest.fn() },
}));

jest.mock('../../../infra/reports/pdf-download', () => ({
  pdfDownload: { downloadAndStorePdf: jest.fn() },
}));

jest.mock('../../../infra/http/api-client', () => ({
  getAccessToken: jest.fn(() => 'test-token'),
}));

jest.mock('../../../infra/env', () => ({
  env: { API_BASE_URL: 'http://localhost:3001' },
}));

const mockGetRevenue = reportsApi.getMonthlyRevenue as jest.Mock;
const mockGetDues = reportsApi.getStudentWiseDues as jest.Mock;

const mockRevenue = {
  totalAmount: 1500,
  transactionCount: 2,
  transactions: [
    {
      id: 'tx-1',
      studentId: 's1',
      monthKey: '2026-03',
      amount: 800,
      source: 'OWNER_DIRECT',
      receiptNumber: 'PC-000001',
      collectedByUserId: 'u1',
      approvedByUserId: 'u1',
      createdAt: '2026-03-04T10:00:00.000Z',
    },
    {
      id: 'tx-2',
      studentId: 's2',
      monthKey: '2026-03',
      amount: 700,
      source: 'STAFF_APPROVED',
      receiptNumber: 'PC-000002',
      collectedByUserId: 'u2',
      approvedByUserId: 'u1',
      createdAt: '2026-03-04T11:00:00.000Z',
    },
  ],
};

const mockDues = [
  {
    studentId: 's1',
    studentName: 'Priya Sharma',
    monthKey: '2026-03',
    amount: 500,
    status: 'DUE',
    pendingMonthsCount: 2,
    totalPendingAmount: 1000,
  },
];

describe('ReportsHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows skeleton on initial load', async () => {
    let resolveRevenue: (v: unknown) => void;
    let resolveDues: (v: unknown) => void;
    mockGetRevenue.mockReturnValue(
      new Promise((resolve) => {
        resolveRevenue = resolve;
      }),
    );
    mockGetDues.mockReturnValue(
      new Promise((resolve) => {
        resolveDues = resolve;
      }),
    );

    render(<ReportsHomeScreen />);

    expect(screen.getByTestId('skeleton-container')).toBeTruthy();

    await act(async () => {
      resolveRevenue!(ok(mockRevenue));
      resolveDues!(ok(mockDues));
    });
  });

  it('renders revenue data after load', async () => {
    mockGetRevenue.mockResolvedValue(ok(mockRevenue));
    mockGetDues.mockResolvedValue(ok(mockDues));

    render(<ReportsHomeScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('revenue-container')).toBeTruthy();
    });

    expect(screen.getByText('PC-000001')).toBeTruthy();
    expect(screen.getByText('PC-000002')).toBeTruthy();
  });

  it('shows error with retry on API failure', async () => {
    mockGetRevenue.mockResolvedValue(err({ code: 'NETWORK', message: 'Network error' }));
    mockGetDues.mockResolvedValue(ok(mockDues));

    render(<ReportsHomeScreen />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeTruthy();
    });
  });

  it('shows export button for revenue', async () => {
    mockGetRevenue.mockResolvedValue(ok(mockRevenue));
    mockGetDues.mockResolvedValue(ok(mockDues));

    render(<ReportsHomeScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('export-revenue-pdf')).toBeTruthy();
    });
  });

  it('renders pending dues list when segment switched', async () => {
    mockGetRevenue.mockResolvedValue(ok(mockRevenue));
    mockGetDues.mockResolvedValue(ok(mockDues));

    render(<ReportsHomeScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('revenue-container')).toBeTruthy();
    });

    // Switch to pending dues
    fireEvent.press(screen.getByTestId('segment-1'));

    await waitFor(() => {
      expect(screen.getByTestId('dues-list')).toBeTruthy();
    });

    expect(screen.getByText('Priya Sharma')).toBeTruthy();
  });
});
