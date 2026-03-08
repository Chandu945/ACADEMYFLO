/**
 * Port for wrapping external calls with timeout + bounded retry.
 * Infrastructure adapters use this to ensure safe external communication.
 */
export interface ExternalCallOptions {
  /** Timeout in milliseconds for the call. */
  timeoutMs: number;
  /** Number of retries (0 = no retry, max 3). */
  retries: number;
  /** Base backoff in milliseconds between retries. */
  retryBackoffMs: number;
  /** Whether the operation is idempotent (retries only allowed when true). */
  idempotent: boolean;
}

export interface ExternalCallPolicyPort {
  /**
   * Execute `fn` with timeout and optional bounded retries.
   * @param opName - human-readable operation name for logging
   * @param fn - the async function to execute; receives an AbortSignal
   * @param options - timeout/retry configuration
   */
  run<T>(
    opName: string,
    fn: (ctx: { signal: AbortSignal }) => Promise<T>,
    options: ExternalCallOptions,
  ): Promise<T>;
}

export const EXTERNAL_CALL_POLICY = Symbol('EXTERNAL_CALL_POLICY');
