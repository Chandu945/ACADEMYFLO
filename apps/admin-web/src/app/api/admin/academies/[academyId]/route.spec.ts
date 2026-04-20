import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const mockResolveAccessToken = jest.fn();
const mockHandleBackend401 = jest.fn();
const mockApiGet = jest.fn();

jest.mock('@/infra/auth/bff-auth', () => ({
  resolveAccessToken: (...args: unknown[]) => mockResolveAccessToken(...args),
  handleBackend401: (...args: unknown[]) => mockHandleBackend401(...args),
}));

jest.mock('@/infra/http/api-client', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
}));

import { GET } from './route';

function createMockRequest(): NextRequest {
  const url = new URL('http://localhost:3002/api/admin/academies/a1');
  return {
    headers: { get: () => null },
    nextUrl: url,
  } as unknown as NextRequest;
}

const mockParams = Promise.resolve({ academyId: '507f1f77bcf86cd799439011' });

beforeEach(() => {
  jest.clearAllMocks();
});

const validDetail = {
  academyId: '507f1f77bcf86cd799439011',
  academyName: 'Test Academy',
  loginDisabled: false,
  owner: { fullName: 'John', email: 'j@t.com', phoneNumber: '+91123' },
  subscription: {
    status: 'TRIAL',
    tierKey: null,
    trialEndAt: '2026-02-01T00:00:00Z',
    paidStartAt: null,
    paidEndAt: null,
    manualNotes: null,
    paymentReference: null,
  },
  metrics: { activeStudentCount: 5, staffCount: 1, thisMonthRevenueTotal: 0 },
};

describe('GET /api/admin/academies/[academyId]', () => {
  it('returns 401 when no session', async () => {
    mockResolveAccessToken.mockResolvedValue(null);

    await GET(createMockRequest(), { params: mockParams });

    expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 });
  });

  it('returns detail on success', async () => {
    mockResolveAccessToken.mockResolvedValue('tok');
    mockApiGet.mockResolvedValue({ ok: true, data: validDetail });

    await GET(createMockRequest(), { params: mockParams });

    expect(mockApiGet).toHaveBeenCalledWith('/api/v1/admin/academies/507f1f77bcf86cd799439011', { accessToken: 'tok' });
    expect(NextResponse.json).toHaveBeenCalledWith({
      success: true,
      data: validDetail,
    });
  });

  it('returns 404 when academy not found', async () => {
    mockResolveAccessToken.mockResolvedValue('tok');
    mockApiGet.mockResolvedValue({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Not found' },
    });

    await GET(createMockRequest(), { params: mockParams });

    expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Academy not found' }, { status: 404 });
  });

  it('clears cookie on backend 401', async () => {
    mockResolveAccessToken.mockResolvedValue('expired-tok');
    mockApiGet.mockResolvedValue({
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Token expired' },
    });

    await GET(createMockRequest(), { params: mockParams });

    expect(mockHandleBackend401).toHaveBeenCalled();
    expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 });
  });
});
