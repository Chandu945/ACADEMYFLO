import { getDetail } from './academy-detail.service';

const mockFetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

const validPayload = {
  academyId: 'a1',
  academyName: 'Test Academy',
  loginDisabled: false,
  ownerUserId: 'u1',
  ownerName: 'John Doe',
  ownerEmail: 'john@test.com',
  ownerPhone: '+919876543210',
  subscription: {
    id: 'sub1',
    status: 'TRIAL',
    tierKey: null,
    trialStartAt: null,
    trialEndAt: '2026-02-01T00:00:00.000Z',
    paidStartAt: null,
    paidEndAt: null,
    manualNotes: null,
    paymentReference: null,
  },
  studentCount: 10,
  staffCount: 2,
  revenueThisMonth: 0,
};

describe('getDetail', () => {
  it('maps valid backend payload', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: validPayload }),
    } as Response);

    const result = await getDetail('a1', 'tok');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.academyId).toBe('a1');
      expect(result.data.academyName).toBe('Test Academy');
      expect(result.data.owner.fullName).toBe('John Doe');
      expect(result.data.subscription.status).toBe('TRIAL');
      expect(result.data.metrics.activeStudentCount).toBe(10);
    }
  });

  it('passes access token in Authorization header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: validPayload }),
    } as Response);

    await getDetail('a1', 'my-token');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/academies/a1',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer my-token' }),
      }),
    );
  });

  it('rejects invalid payload', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { bad: true } }),
    } as Response);

    const result = await getDetail('a1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  it('returns UNAUTHORIZED on 401', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response);

    const result = await getDetail('a1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('returns NOT_FOUND on 404', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Academy not found' }),
    } as Response);

    const result = await getDetail('nonexistent');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('returns NETWORK on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await getDetail('a1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NETWORK');
    }
  });
});
