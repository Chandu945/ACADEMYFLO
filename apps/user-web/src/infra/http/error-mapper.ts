import { NextResponse } from 'next/server';

import { AppError } from '@/domain/common/errors';
import type { AppErrorCode } from '@/domain/common/errors';

/** Build a NextResponse from an AppError — use after `if (!result.ok)` checks. */
export function toErrorResponse(error: AppError): NextResponse {
  return NextResponse.json(
    { message: error.message },
    { status: errorCodeToStatus(error.code) },
  );
}

export function errorCodeToStatus(code: AppErrorCode): number {
  switch (code) {
    case 'UNAUTHORIZED': return 401;
    case 'FORBIDDEN': return 403;
    case 'NOT_FOUND': return 404;
    case 'CONFLICT': return 409;
    case 'RATE_LIMITED': return 429;
    case 'VALIDATION': return 400;
    case 'NETWORK': return 502;
    default: return 500;
  }
}

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
