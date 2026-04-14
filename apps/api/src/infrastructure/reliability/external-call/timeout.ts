export class ExternalTimeoutError extends Error {
  constructor(opName: string, timeoutMs: number) {
    super(`External call '${opName}' timed out after ${timeoutMs}ms`);
    this.name = 'ExternalTimeoutError';
  }
}
