import { AppError } from '@/domain/common/errors';
import { login, logout, refreshAccessToken } from './admin-auth.service';

const mockFetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('login', () => {
  it('returns AuthSession on success', async () => {
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
    expect(result).toEqual(session);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('throws AppError on 401', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid credentials' }),
    } as Response);

    await expect(login('a@b.com', 'wrong')).rejects.toThrow(AppError);
    await expect(login('a@b.com', 'wrong')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('throws AppError on 400', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Validation failed' }),
    } as Response);

    await expect(login('bad', 'p')).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('throws on malformed success response (contract drift)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: 'tok' /* missing user + deviceId */ }),
    } as Response);

    await expect(login('a@b.com', 'pass')).rejects.toMatchObject({ code: 'UNKNOWN' });
  });

  it('throws on response with wrong role', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: 'tok',
        deviceId: 'd1',
        user: { id: '1', email: 'a@b.com', fullName: 'X', role: 'OWNER' },
      }),
    } as Response);

    await expect(login('a@b.com', 'pass')).rejects.toMatchObject({ code: 'UNKNOWN' });
  });
});

describe('refreshAccessToken', () => {
  it('returns accessToken on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: 'new-tok' }),
    } as Response);

    const result = await refreshAccessToken();
    expect(result.accessToken).toBe('new-tok');
  });

  it('throws UNAUTHORIZED on failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Session expired' }),
    } as Response);

    await expect(refreshAccessToken()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('logout', () => {
  it('calls BFF logout route', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    await logout('tok');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer tok',
        }),
      }),
    );
  });
});
