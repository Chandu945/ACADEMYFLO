export type { AppErrorCode } from '@playconnect/contracts';
import type { AppErrorCode } from '@playconnect/contracts';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly fieldErrors?: Record<string, string>;

  constructor(code: AppErrorCode, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.code = code;
    this.fieldErrors = fieldErrors;
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

  static rateLimited(message = 'Too many requests'): AppError {
    return new AppError('RATE_LIMITED', message);
  }

  static unknown(message = 'Something went wrong'): AppError {
    return new AppError('UNKNOWN', message);
  }
}

export type AppResult<T> = { ok: true; data: T } | { ok: false; error: AppError };
