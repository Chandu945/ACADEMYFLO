import {
  fetchWithTimeout,
  policyFetch,
  RequestTimeoutError,
} from './request-policy';

// Mock global fetch
const mockFetch = jest.fn();
(globalThis as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

function okResponse() {
  return new Response('ok', { status: 200 });
}

describe('request-policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('fetchWithTimeout', () => {
    it('returns response on success', async () => {
      mockFetch.mockResolvedValue(okResponse());

      const res = await fetchWithTimeout('http://localhost/api', { method: 'GET' });
      expect(res.status).toBe(200);
    });

    it('throws RequestTimeoutError when request times out', async () => {
      mockFetch.mockImplementation((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const abortErr = new Error('The operation was aborted.');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        }),
      );

      const promise = fetchWithTimeout('http://localhost/api', { method: 'GET' }, { timeoutMs: 100 });

      // Set up assertion before advancing timers to avoid unhandled rejection
      const assertion = expect(promise).rejects.toThrow(RequestTimeoutError);
      await jest.advanceTimersByTimeAsync(101);
      await assertion;
    });
  });

  describe('policyFetch', () => {
    it('retries GET once on network error', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockResolvedValueOnce(okResponse());

      jest.useRealTimers();
      const res = await policyFetch('http://localhost/api', { method: 'GET' });
      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does NOT retry POST on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network request failed'));

      jest.useRealTimers();
      await expect(
        policyFetch('http://localhost/api', { method: 'POST' }),
      ).rejects.toThrow('Network request failed');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry PATCH on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network request failed'));

      jest.useRealTimers();
      await expect(
        policyFetch('http://localhost/api', { method: 'PATCH' }),
      ).rejects.toThrow('Network request failed');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry DELETE on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network request failed'));

      jest.useRealTimers();
      await expect(
        policyFetch('http://localhost/api', { method: 'DELETE' }),
      ).rejects.toThrow('Network request failed');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does not retry GET on non-network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Invalid JSON'));

      jest.useRealTimers();
      await expect(
        policyFetch('http://localhost/api', { method: 'GET' }),
      ).rejects.toThrow('Invalid JSON');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
