/**
 * Request policy for mobile app.
 * Adds timeout + GET-only retry for idempotent requests.
 */

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_BACKOFF_MS = 500;

export class RequestTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request to '${url}' timed out after ${timeoutMs}ms`);
    this.name = 'RequestTimeoutError';
  }
}

export interface RequestPolicyOptions {
  timeoutMs?: number;
}

/**
 * Wrap a fetch call with a timeout via AbortController.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  options?: RequestPolicyOptions,
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new RequestTimeoutError(url, timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('fetch failed') ||
      error.message.includes('Network request failed') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ECONNRESET')
    );
  }
  return false;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const SAFE_METHODS: HttpMethod[] = ['GET'];

/**
 * Fetch with timeout + retry for safe (GET) methods only.
 * POST/PUT/PATCH/DELETE never retry to prevent duplicate mutations.
 */
export async function policyFetch(
  url: string,
  init: RequestInit & { method: string },
  options?: RequestPolicyOptions,
): Promise<Response> {
  const isSafe = SAFE_METHODS.includes(init.method as HttpMethod);

  try {
    return await fetchWithTimeout(url, init, options);
  } catch (error) {
    if (isSafe && isNetworkError(error)) {
      await new Promise<void>((r) => setTimeout(() => r(), DEFAULT_RETRY_BACKOFF_MS));
      return fetchWithTimeout(url, init, options);
    }
    throw error;
  }
}
