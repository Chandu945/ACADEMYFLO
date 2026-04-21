import type { AppErrorCode } from '@academyflo/contracts';
export type { AppErrorCode } from '@academyflo/contracts';

export type AppError = {
  code: AppErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
  retryAfterSeconds?: number;
  /**
   * Server-assigned request ID. Populated from the upstream api's
   * X-Request-Id response header so support can correlate a user's
   * failure to a single trace in api logs.
   */
  requestId?: string;
};

export function validation(message: string, fieldErrors?: Record<string, string>): AppError {
  return { code: 'VALIDATION', message, fieldErrors };
}

export function network(message = 'Network error'): AppError {
  return { code: 'NETWORK', message };
}

export function unknown(message = 'An unexpected error occurred'): AppError {
  return { code: 'UNKNOWN', message };
}
