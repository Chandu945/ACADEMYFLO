import { NextResponse } from 'next/server';

import { AppError } from '@/domain/common/errors';
import type { AppErrorCode } from '@/domain/common/errors';

/** Build a NextResponse from an AppError — use after `if (!result.ok)` checks. */
export function toErrorResponse(error: AppError): NextResponse {
  const body: Record<string, unknown> = { message: error.message };
  if (error.fieldErrors) {
    body['fieldErrors'] = error.fieldErrors;
  }
  // Include the upstream request ID so the browser client can show it and
  // support can correlate the error with api logs.
  if (error.requestId) {
    body['requestId'] = error.requestId;
  }
  const headers: Record<string, string> = {};
  if (error.code === 'RATE_LIMITED' && error.retryAfterSeconds != null) {
    headers['Retry-After'] = String(error.retryAfterSeconds);
  }
  if (error.requestId) {
    headers['X-Request-Id'] = error.requestId;
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
  requestId?: string | null,
): AppError {
  const message = typeof body?.['message'] === 'string' ? body['message'] : undefined;
  const fieldErrors =
    body?.['fieldErrors'] && typeof body['fieldErrors'] === 'object'
      ? (body['fieldErrors'] as Record<string, string>)
      : undefined;
  // Prefer the X-Request-Id header; fall back to the envelope body field
  // emitted by the NestJS GlobalExceptionFilter.
  const rid = requestId ?? (typeof body?.['requestId'] === 'string' ? body['requestId'] : undefined);

  switch (status) {
    case 400:
      return AppError.validation(message ?? 'Validation failed', fieldErrors, rid);
    case 401:
      return AppError.unauthorized(message ?? 'Unauthorized', rid);
    case 403:
      return AppError.forbidden(message ?? 'Forbidden', rid);
    case 404:
      return AppError.notFound(message ?? 'Not found', rid);
    case 409:
      return AppError.conflict(message ?? 'Conflict', rid);
    case 429:
      return AppError.rateLimited(message ?? 'Too many requests', parseRetryAfter(retryAfterHeader), rid);
    case 503:
      return AppError.unknown(message ?? 'Service temporarily unavailable', rid);
    default:
      return AppError.unknown(message ?? 'Something went wrong', rid);
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
