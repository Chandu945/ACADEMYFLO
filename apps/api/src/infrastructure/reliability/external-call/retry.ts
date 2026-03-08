/**
 * Retry logic with exponential backoff + jitter.
 * Only retries when the operation is marked as idempotent.
 */
export interface RetryOptions {
  maxRetries: number;
  backoffMs: number;
  idempotent: boolean;
}

function jitteredBackoff(base: number, attempt: number): number {
  const exponential = base * Math.pow(2, attempt);
  const jitter = Math.random() * exponential * 0.5;
  return exponential + jitter;
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors
    if (error.name === 'AbortError') return false; // Timeout — don't retry the same timeout
    if (error.message.includes('fetch failed')) return true;
    if (error.message.includes('ECONNREFUSED')) return true;
    if (error.message.includes('ECONNRESET')) return true;
    if (error.message.includes('ETIMEDOUT')) return true;
    // HTTP 5xx (from our adapters that throw on non-ok)
    if (/5\d{2}/.test(error.message)) return true;
  }
  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  onRetry?: (attempt: number, error: unknown) => void,
): Promise<T> {
  const { maxRetries, backoffMs, idempotent } = options;

  // Never retry non-idempotent operations
  if (!idempotent || maxRetries <= 0) {
    return fn();
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries && isRetryable(error)) {
        onRetry?.(attempt + 1, error);
        const delay = jitteredBackoff(backoffMs, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}
