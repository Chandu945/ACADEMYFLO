import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mock infra modules before imports
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

function createMockRequest(authHeader?: string): NextRequest {
  return {
    headers: {
      get: (name: string) => (name === 'Authorization' ? (authHeader ?? null) : null),
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/admin/dashboard', () => {
  it('returns 401 when no session or token', async () => {
    mockResolveAccessToken.mockResolvedValue(null);

    await GET(createMockRequest());

    expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 });
  });

  it('returns dashboard data on success', async () => {
    mockResolveAccessToken.mockResolvedValue('access-tok');
    mockApiGet.mockResolvedValue({
      ok: true,
      data: {
        totalAcademies: 10,
        activeAcademies: 5,
        trialAcademies: 3,
        blockedAcademies: 2,
      },
    });

    await GET(createMockRequest('Bearer access-tok'));

    expect(mockApiGet).toHaveBeenCalledWith('/api/v1/admin/dashboard', {
      accessToken: 'access-tok',
    });
    expect(NextResponse.json).toHaveBeenCalledWith({
      success: true,
      data: {
        totalAcademies: 10,
        activeAcademies: 5,
        trialAcademies: 3,
        blockedAcademies: 2,
      },
    });
  });

  it('clears cookie and returns 401 on backend 401', async () => {
    mockResolveAccessToken.mockResolvedValue('expired-tok');
    mockApiGet.mockResolvedValue({
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Token expired' },
    });

    await GET(createMockRequest('Bearer expired-tok'));

    expect(mockHandleBackend401).toHaveBeenCalled();
    expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 });
  });

  it('returns 500 on backend error', async () => {
    mockResolveAccessToken.mockResolvedValue('tok');
    mockApiGet.mockResolvedValue({
      ok: false,
      error: { code: 'UNKNOWN', message: 'Internal error' },
    });

    await GET(createMockRequest('Bearer tok'));

    expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Internal error' }, { status: 500 });
  });
});
