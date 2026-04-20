import { NextResponse } from 'next/server';

import { AppError } from '@/domain/common/errors';
import type { AppErrorCode } from '@/domain/common/errors';

/** Build a NextResponse from an AppError — use after `if (!result.ok)` checks. */
export function toErrorResponse(error: AppError): NextResponse {
  const body: Record<string, unknown> = { message: error.message };
  if (error.fieldErrors) {
    body['fieldErrors'] = error.fieldErrors;
  }
  const headers: Record<string, string> = {};
  if (error.code === 'RATE_LIMITED' && error.retryAfterSeconds != null) {
    headers['Retry-After'] = String(error.retryAfterSeconds);
  }
  return NextResponse.json(body, { status: errorCodeToStatus(error.code), headers });
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

export function mapApiError(
  status: number,
  body?: Record<string, unknown>,
  retryAfterHeader?: string | null,
): AppError {
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
      return AppError.rateLimited(message ?? 'Too many requests', parseRetryAfter(retryAfterHeader));
    case 503:
      return AppError.unknown(message ?? 'Service temporarily unavailable');
    default:
      return AppError.unknown(message ?? 'Something went wrong');
  }
}

// Retry-After is either delta-seconds or an HTTP-date per RFC 7231. We only
// expect delta-seconds from our own upstream but handle HTTP-date defensively
// so a future proxy change doesn't silently drop the signal.
function parseRetryAfter(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber >= 0) return Math.ceil(asNumber);
  const asDate = Date.parse(value);
  if (!Number.isNaN(asDate)) {
    const diff = Math.ceil((asDate - Date.now()) / 1000);
    return diff > 0 ? diff : undefined;
  }
  return undefined;
}
