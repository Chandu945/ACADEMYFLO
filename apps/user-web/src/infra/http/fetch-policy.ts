const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_BACKOFF_MS = 500;

export class FetchTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request to '${url}' timed out after ${timeoutMs}ms`);
    this.name = 'FetchTimeoutError';
  }
}

export interface FetchPolicyOptions {
  timeoutMs?: number;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  options?: FetchPolicyOptions,
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new FetchTimeoutError(url, timeoutMs);
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
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ECONNRESET')
    );
  }
  return false;
}

export async function safeFetchGet(
  url: string,
  init: RequestInit,
  options?: FetchPolicyOptions,
): Promise<Response> {
  try {
    return await fetchWithTimeout(url, init, options);
  } catch (error) {
    if (isNetworkError(error)) {
      await new Promise((r) => setTimeout(r, DEFAULT_RETRY_BACKOFF_MS));
      return fetchWithTimeout(url, init, options);
    }
    throw error;
  }
}

export async function safeFetchMutate(
  url: string,
  init: RequestInit,
  options?: FetchPolicyOptions,
): Promise<Response> {
  return fetchWithTimeout(url, init, options);
}
