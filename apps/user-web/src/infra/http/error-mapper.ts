import { AppError } from '@/domain/common/errors';

export function mapApiError(status: number, body?: Record<string, unknown>): AppError {
  const message = typeof body?.['message'] === 'string' ? body['message'] : undefined;
  const fieldErrors =
    body?.['fieldErrors'] && typeof body['fieldErrors'] === 'object'
      ? (body['fieldErrors'] as Record<string, string>)
      : undefined;

  switch (status) {
    case 400:
      return AppError.validation(message ?? 'Validation failed', fieldErrors);
    case 401:
      return AppError.unauthorized(message ?? 'Unauthorized');
    case 403:
      return AppError.forbidden(message ?? 'Forbidden');
    case 404:
      return AppError.notFound(message ?? 'Not found');
    case 409:
      return AppError.conflict(message ?? 'Conflict');
    case 429:
      return AppError.rateLimited(message ?? 'Too many requests');
    default:
      return AppError.unknown(message ?? 'Something went wrong');
  }
}
