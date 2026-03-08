import {
  setManualSubscription,
  deactivateSubscription,
  setLoginDisabled,
  forceLogout,
  resetOwnerPassword,
} from './academy-actions.service';

const mockFetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('setManualSubscription', () => {
  it('calls correct endpoint and returns ok on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const result = await setManualSubscription(
      'a1',
      {
        tierKey: 'TIER_0_50',
        paidStartAt: '2026-03-01',
        paidEndAt: '2026-06-01',
      },
      'tok',
    );

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/academies/a1/subscription/manual',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns error on failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid input' }),
    } as Response);

    const result = await setManualSubscription('a1', {
      tierKey: 'TIER_0_50',
      paidStartAt: '2026-03-01',
      paidEndAt: '2026-06-01',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
  });
});

describe('deactivateSubscription', () => {
  it('calls correct endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const result = await deactivateSubscription('a1', 'tok');
    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/academies/a1/subscription/deactivate',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('setLoginDisabled', () => {
  it('sends disabled flag in body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await setLoginDisabled('a1', true, 'tok');

    const call = mockFetch.mock.calls[0]!;
    const body = JSON.parse(call[1]!.body as string);
    expect(body).toEqual({ disabled: true });
  });
});

describe('forceLogout', () => {
  it('calls correct endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const result = await forceLogout('a1', 'tok');
    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/academies/a1/force-logout',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('resetOwnerPassword', () => {
  it('returns temporary password on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { temporaryPassword: 'TempPass123!' } }),
    } as Response);

    const result = await resetOwnerPassword('a1', undefined, 'tok');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.temporaryPassword).toBe('TempPass123!');
    }
  });

  it('sends temporaryPassword when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { temporaryPassword: 'MyCustomPw1!' } }),
    } as Response);

    await resetOwnerPassword('a1', 'MyCustomPw1!', 'tok');

    const call = mockFetch.mock.calls[0]!;
    const body = JSON.parse(call[1]!.body as string);
    expect(body).toEqual({ temporaryPassword: 'MyCustomPw1!' });
  });

  it('returns error on failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Academy not found' }),
    } as Response);

    const result = await resetOwnerPassword('a1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('returns NETWORK on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await resetOwnerPassword('a1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NETWORK');
  });
});
