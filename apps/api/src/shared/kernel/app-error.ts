/**
 * Domain-safe error representation.
 * Used with Result type to avoid throwing inside domain logic.
 */
export class AppError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    this.code = code;
    this.message = message;
    this.details = details;
  }

  static validation(message: string, details?: Record<string, unknown>): AppError {
    return new AppError('VALIDATION', message, details);
  }

  static notFound(entity: string, id?: string): AppError {
    const msg = id ? `${entity} with id '${id}' not found` : `${entity} not found`;
    return new AppError('NOT_FOUND', msg);
  }

  static conflict(message: string): AppError {
    return new AppError('CONFLICT', message);
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError('UNAUTHORIZED', message);
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError('FORBIDDEN', message);
  }
}
