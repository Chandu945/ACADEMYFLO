export type { AppErrorCode } from '@academyflo/contracts';
import type { AppErrorCode } from '@academyflo/contracts';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly fieldErrors?: Record<string, string>;
  readonly retryAfterSeconds?: number;
  readonly requestId?: string;

  constructor(
    code: AppErrorCode,
    message: string,
    fieldErrors?: Record<string, string>,
    retryAfterSeconds?: number,
    requestId?: string,
  ) {
    super(message);
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.retryAfterSeconds = retryAfterSeconds;
    this.requestId = requestId;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static unauthorized(message = 'Unauthorized', requestId?: string): AppError {
    return new AppError('UNAUTHORIZED', message, undefined, undefined, requestId);
  }

  static validation(
    message = 'Validation failed',
    fieldErrors?: Record<string, string>,
    requestId?: string,
  ): AppError {
    return new AppError('VALIDATION', message, fieldErrors, undefined, requestId);
  }

  static notFound(message = 'Not found', requestId?: string): AppError {
    return new AppError('NOT_FOUND', message, undefined, undefined, requestId);
  }

  static forbidden(message = 'Forbidden', requestId?: string): AppError {
    return new AppError('FORBIDDEN', message, undefined, undefined, requestId);
  }

  static network(message = 'Network error', requestId?: string): AppError {
    return new AppError('NETWORK', message, undefined, undefined, requestId);
  }

  static conflict(message = 'Conflict', requestId?: string): AppError {
    return new AppError('CONFLICT', message, undefined, undefined, requestId);
  }

  static rateLimited(
    message = 'Too many requests',
    retryAfterSeconds?: number,
    requestId?: string,
  ): AppError {
    return new AppError('RATE_LIMITED', message, undefined, retryAfterSeconds, requestId);
  }

  static unknown(message = 'Something went wrong', requestId?: string): AppError {
    return new AppError('UNKNOWN', message, undefined, undefined, requestId);
  }
}

export type AppResult<T> = { ok: true; data: T } | { ok: false; error: AppError };
