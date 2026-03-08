import { ExternalCallPolicy, ExternalUnavailableError } from './external-call-policy';
import { ExternalTimeoutError } from './timeout';
import type { LoggerPort } from '@shared/logging/logger.port';

function mockLogger(): LoggerPort {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
}

describe('ExternalCallPolicy', () => {
  let policy: ExternalCallPolicy;
  let logger: LoggerPort;

  beforeEach(() => {
    logger = mockLogger();
    policy = new ExternalCallPolicy(logger);
  });

  it('executes function successfully', async () => {
    const result = await policy.run(
      'test-op',
      async () => 'ok',
      { timeoutMs: 5000, retries: 0, retryBackoffMs: 100, idempotent: false },
    );

    expect(result).toBe('ok');
    expect(logger.debug).toHaveBeenCalledWith('externalCallStart', { opName: 'test-op' });
  });

  it('times out and throws ExternalTimeoutError', async () => {
    await expect(
      policy.run(
        'slow-op',
        async ({ signal }) => {
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, 5000);
            signal.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
          });
          return 'never';
        },
        { timeoutMs: 50, retries: 0, retryBackoffMs: 100, idempotent: false },
      ),
    ).rejects.toThrow(ExternalTimeoutError);

    expect(logger.error).toHaveBeenCalledWith(
      'externalCallTimeout',
      expect.objectContaining({ opName: 'slow-op', timeoutMs: 50 }),
    );
  });

  it('retries on retryable error when idempotent=true', async () => {
    let calls = 0;
    const result = await policy.run(
      'retry-op',
      async () => {
        calls++;
        if (calls === 1) throw new Error('fetch failed: ECONNREFUSED');
        return 'recovered';
      },
      { timeoutMs: 5000, retries: 2, retryBackoffMs: 10, idempotent: true },
    );

    expect(result).toBe('recovered');
    expect(calls).toBe(2);
    expect(logger.warn).toHaveBeenCalledWith(
      'externalCallRetry',
      expect.objectContaining({ opName: 'retry-op', attempt: 1 }),
    );
  });

  it('does NOT retry when idempotent=false', async () => {
    let calls = 0;

    await expect(
      policy.run(
        'no-retry-op',
        async () => {
          calls++;
          throw new Error('fetch failed: ECONNREFUSED');
        },
        { timeoutMs: 5000, retries: 2, retryBackoffMs: 10, idempotent: false },
      ),
    ).rejects.toThrow('fetch failed');

    expect(calls).toBe(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('caps retries at 3', async () => {
    let calls = 0;

    await expect(
      policy.run(
        'max-retry-op',
        async () => {
          calls++;
          throw new Error('fetch failed: ECONNRESET');
        },
        { timeoutMs: 5000, retries: 10, retryBackoffMs: 10, idempotent: true },
      ),
    ).rejects.toThrow();

    // 1 initial + 3 retries = 4
    expect(calls).toBe(4);
  });

  it('does not retry non-retryable errors', async () => {
    let calls = 0;

    await expect(
      policy.run(
        'non-retryable-op',
        async () => {
          calls++;
          throw new Error('Invalid JSON');
        },
        { timeoutMs: 5000, retries: 2, retryBackoffMs: 10, idempotent: true },
      ),
    ).rejects.toThrow('Invalid JSON');

    expect(calls).toBe(1);
  });
});
