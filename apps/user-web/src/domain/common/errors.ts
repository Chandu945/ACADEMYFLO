export type { AppErrorCode } from '@academyflo/contracts';
import type { AppErrorCode } from '@academyflo/contracts';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly fieldErrors?: Record<string, string>;
  readonly retryAfterSeconds?: number;

  constructor(
    code: AppErrorCode,
    message: string,
    fieldErrors?: Record<string, string>,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.retryAfterSeconds = retryAfterSeconds;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError('UNAUTHORIZED', message);
  }

  static validation(message = 'Validation failed', fieldErrors?: Record<string, string>): AppError {
    return new AppError('VALIDATION', message, fieldErrors);
  }

  static notFound(message = 'Not found'): AppError {
    return new AppError('NOT_FOUND', message);
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError('FORBIDDEN', message);
  }

  static network(message = 'Network error'): AppError {
    return new AppError('NETWORK', message);
  }

  static conflict(message = 'Conflict'): AppError {
    return new AppError('CONFLICT', message);
  }

  static rateLimited(message = 'Too many requests', retryAfterSeconds?: number): AppError {
    return new AppError('RATE_LIMITED', message, undefined, retryAfterSeconds);
  }

  static unknown(message = 'Something went wrong'): AppError {
    return new AppError('UNKNOWN', message);
  }
}

export type AppResult<T> = { ok: true; data: T } | { ok: false; error: AppError };
