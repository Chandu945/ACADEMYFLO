import { AppError } from '@/domain/common/errors';

export function mapApiError(status: number, body?: Record<string, unknown>): AppError {
  const message = typeof body?.['message'] === 'string' ? body['message'] : undefined;

  switch (status) {
    case 400:
      return AppError.validation(message ?? 'Validation failed');
    case 401:
      return AppError.unauthorized(message ?? 'Unauthorized');
    case 403:
      return AppError.forbidden(message ?? 'Forbidden');
    case 404:
      return AppError.notFound(message ?? 'Not found');
    default:
      return AppError.unknown(message ?? 'Something went wrong');
  }
}
