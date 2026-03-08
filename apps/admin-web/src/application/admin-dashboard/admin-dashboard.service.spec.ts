import { getDashboard } from './admin-dashboard.service';

const mockFetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

const validBackendPayload = {
  totalAcademies: 42,
  activeAcademies: 30,
  trialAcademies: 8,
  blockedAcademies: 4,
};

describe('getDashboard', () => {
  it('maps valid backend payload into domain type', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: validBackendPayload }),
    } as Response);

    const result = await getDashboard('tok');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.totalAcademies).toBe(42);
      expect(result.data.activeTrials).toBe(8);
      expect(result.data.activePaid).toBe(30);
      expect(result.data.disabled).toBe(4);
      expect(result.data.blocked).toBe(4);
    }
  });

  it('passes access token in Authorization header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: validBackendPayload }),
    } as Response);

    await getDashboard('my-token');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/dashboard',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer my-token' }),
      }),
    );
  });

  it('rejects payload with negative counts', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { ...validBackendPayload, totalAcademies: -1 },
      }),
    } as Response);

    const result = await getDashboard();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  it('rejects payload with missing keys', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { totalAcademies: 10 },
      }),
    } as Response);

    const result = await getDashboard();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
      expect(result.error.message).toBe('Unexpected response format');
    }
  });

  it('returns UNAUTHORIZED on 401', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response);

    const result = await getDashboard();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('returns UNKNOWN on 500', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal error' }),
    } as Response);

    const result = await getDashboard();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNKNOWN');
    }
  });

  it('returns NETWORK on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await getDashboard();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NETWORK');
    }
  });
});
