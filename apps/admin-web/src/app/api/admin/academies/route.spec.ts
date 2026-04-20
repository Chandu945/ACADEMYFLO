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

jest.mock('@academyflo/contracts', () => ({
  ADMIN_ACADEMY_STATUSES: ['TRIAL', 'ACTIVE_PAID', 'EXPIRED_GRACE', 'BLOCKED', 'DISABLED'],
  TIER_KEYS: ['TIER_0_50', 'TIER_51_100', 'TIER_101_PLUS'],
}));

import { GET } from './route';

function createMockRequest(queryString = ''): NextRequest {
  const url = new URL(`http://localhost:3002/api/admin/academies?${queryString}`);
  return {
    headers: {
      get: () => null,
    },
    nextUrl: url,
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/admin/academies', () => {
  it('returns 401 when no session', async () => {
    mockResolveAccessToken.mockResolvedValue(null);

    await GET(createMockRequest());

    expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 });
  });

  it('returns 400 for invalid status', async () => {
    mockResolveAccessToken.mockResolvedValue('tok');

    await GET(createMockRequest('status=INVALID'));

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid status filter' },
      { status: 400 },
    );
  });

  it('returns 400 for invalid tier', async () => {
    mockResolveAccessToken.mockResolvedValue('tok');

    await GET(createMockRequest('tier=INVALID_TIER'));

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid tier filter' },
      { status: 400 },
    );
  });

  it('forwards valid tier to backend', async () => {
    mockResolveAccessToken.mockResolvedValue('tok');
    mockApiGet.mockResolvedValue({
      ok: true,
      data: { items: [], total: 0 },
    });

    await GET(createMockRequest('tier=TIER_0_50'));

    expect(mockApiGet).toHaveBeenCalledWith(
      expect.stringContaining('tierKey=TIER_0_50'),
      expect.objectContaining({ accessToken: 'tok' }),
    );
  });

  it('returns data on success', async () => {
    mockResolveAccessToken.mockResolvedValue('tok');
    mockApiGet.mockResolvedValue({
      ok: true,
      data: {
        items: [
          {
            academyId: 'a1',
            academyName: 'Test',
            ownerName: 'Owner',
            ownerEmail: 'o@t.com',
            status: 'TRIAL',
            tierKey: null,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
      },
    });

    await GET(createMockRequest('page=1&pageSize=20'));

    expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining('/api/v1/admin/academies?'), {
      accessToken: 'tok',
    });
    expect(NextResponse.json).toHaveBeenCalledWith({
      success: true,
      data: {
        items: expect.any(Array),
        meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
      },
    });
  });

  it('clears cookie and returns 401 on backend 401', async () => {
    mockResolveAccessToken.mockResolvedValue('expired-tok');
    mockApiGet.mockResolvedValue({
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Token expired' },
    });

    await GET(createMockRequest());

    expect(mockHandleBackend401).toHaveBeenCalled();
    expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 });
  });
});
