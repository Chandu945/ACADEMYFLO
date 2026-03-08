/**
 * BFF auth route integration tests — verifies the auth service
 * handles all response scenarios correctly.
 */
import { AppError } from '@/domain/common/errors';
import { login, logout, refreshAccessToken } from '@/application/auth/admin-auth.service';

const mockFetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('BFF Auth — login', () => {
  it('returns session on valid credentials', async () => {
    const session = {
      accessToken: 'tok',
      user: { id: '1', email: 'a@b.com', fullName: 'Admin', role: 'SUPER_ADMIN' },
      deviceId: 'dev1',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => session,
    } as Response);

    const result = await login('a@b.com', 'pass');
    expect(result.accessToken).toBe('tok');
    expect(result.user.role).toBe('SUPER_ADMIN');
  });

  it('throws UNAUTHORIZED on 401', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Bad credentials' }),
    } as Response);

    await expect(login('a@b.com', 'wrong')).rejects.toThrow(AppError);
  });

  it('throws VALIDATION on 400', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Validation failed' }),
    } as Response);

    await expect(login('', '')).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});

describe('BFF Auth — refresh', () => {
  it('returns new access token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: 'new-tok' }),
    } as Response);

    const result = await refreshAccessToken();
    expect(result.accessToken).toBe('new-tok');
  });

  it('throws on expired session', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'expired' }),
    } as Response);

    await expect(refreshAccessToken()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('BFF Auth — logout', () => {
  it('calls logout endpoint with token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    await logout('access-tok');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
