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
  AUDIT_ACTION_TYPES: [
    'STUDENT_CREATED',
    'STUDENT_UPDATED',
    'STUDENT_STATUS_CHANGED',
    'STUDENT_DELETED',
    'STUDENT_ATTENDANCE_EDITED',
    'PAYMENT_REQUEST_CREATED',
    'PAYMENT_REQUEST_CANCELLED',
    'PAYMENT_REQUEST_APPROVED',
    'PAYMENT_REQUEST_REJECTED',
    'STAFF_ATTENDANCE_CHANGED',
    'MONTHLY_DUES_ENGINE_RAN',
  ],
}));

import { GET } from './route';

function createMockRequest(queryString = ''): NextRequest {
  const url = new URL(`http://localhost:3002/api/admin/academies/507f1f77bcf86cd799439011/audit-logs?${queryString}`);
  return {
    headers: { get: () => null },
    nextUrl: url,
  } as unknown as NextRequest;
}

const mockParams = Promise.resolve({ academyId: '507f1f77bcf86cd799439011' });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/admin/academies/[academyId]/audit-logs', () => {
  it('returns 401 when no session', async () => {
    mockResolveAccessToken.mockResolvedValue(null);

    await GET(createMockRequest(), { params: mockParams });

    expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 });
  });

  it('returns 400 for invalid date format', async () => {
    mockResolveAccessToken.mockResolvedValue('tok');

    await GET(createMockRequest('from=bad-date'), { params: mockParams });

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid from date format' },
      { status: 400 },
    );
  });

  it('returns 400 when from > to', async () => {
    mockResolveAccessToken.mockResolvedValue('tok');

    await GET(createMockRequest('from=2026-03-01&to=2026-02-01'), { params: mockParams });

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'from must be before or equal to to' },
      { status: 400 },
    );
  });

  it('returns 400 for invalid action type', async () => {
    mockResolveAccessToken.mockResolvedValue('tok');

    await GET(createMockRequest('actionType=INVALID'), { params: mockParams });

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid action type filter' },
      { status: 400 },
    );
  });

  it('returns normalized data on success', async () => {
    mockResolveAccessToken.mockResolvedValue('tok');
    mockApiGet.mockResolvedValue({
      ok: true,
      data: {
        items: [
          {
            id: 'log1',
            action: 'STUDENT_CREATED',
            entityType: 'STUDENT',
            entityId: 's1',
            actorUserId: 'u1',
            actorName: null,
            context: { month: '2026-03' },
            createdAt: '2026-03-01T10:00:00Z',
          },
        ],
        meta: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
      },
    });

    await GET(createMockRequest('page=1&pageSize=50'), { params: mockParams });

    expect(NextResponse.json).toHaveBeenCalledWith({
      success: true,
      data: {
        items: [
          {
            id: 'log1',
            occurredAt: '2026-03-01T10:00:00Z',
            actor: { userId: 'u1', name: null },
            actionType: 'STUDENT_CREATED',
            entity: { type: 'STUDENT', id: 's1' },
            context: { month: '2026-03' },
          },
        ],
        meta: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
      },
    });
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
