import {
  fetchWithTimeout,
  safeFetchGet,
  safeFetchMutate,
  FetchTimeoutError,
} from './fetch-policy';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

function okResponse() {
  return new Response('ok', { status: 200 });
}

describe('fetch-policy', () => {
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

    it('throws FetchTimeoutError when request times out', async () => {
      mockFetch.mockImplementation((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
      );

      const promise = fetchWithTimeout('http://localhost/api', { method: 'GET' }, { timeoutMs: 100 });

      jest.advanceTimersByTime(101);

      await expect(promise).rejects.toThrow(FetchTimeoutError);
    });
  });

  describe('safeFetchGet', () => {
    it('retries once on network error', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValueOnce(okResponse());

      jest.useRealTimers(); // need real timers for retry backoff
      const res = await safeFetchGet('http://localhost/api', { method: 'GET' });
      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws on non-network error', async () => {
      mockFetch.mockRejectedValue(new Error('Invalid URL'));

      jest.useRealTimers();
      await expect(
        safeFetchGet('http://localhost/api', { method: 'GET' }),
      ).rejects.toThrow('Invalid URL');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('safeFetchMutate', () => {
    it('does not retry on network error', async () => {
      mockFetch.mockRejectedValue(new Error('fetch failed'));

      jest.useRealTimers();
      await expect(
        safeFetchMutate('http://localhost/api', { method: 'POST' }),
      ).rejects.toThrow('fetch failed');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
