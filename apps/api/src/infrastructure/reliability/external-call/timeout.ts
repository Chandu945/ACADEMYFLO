/**
 * Wraps a promise with an AbortController-based timeout.
 * Rejects with an error if the operation exceeds `timeoutMs`.
 */
export function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fn(controller.signal).finally(() => clearTimeout(timer));
}

export class ExternalTimeoutError extends Error {
  constructor(opName: string, timeoutMs: number) {
    super(`External call '${opName}' timed out after ${timeoutMs}ms`);
    this.name = 'ExternalTimeoutError';
  }
}
