import type { AppError, AppErrorCode } from '../../domain/common/errors';

const STATUS_MAP: Record<number, AppErrorCode> = {
  400: 'VALIDATION',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION',
  429: 'RATE_LIMITED',
  // G1 mobile-alignment fix: 503 was UNKNOWN, which made every storage
  // failure (UPLOAD_FAILED/NETWORK) look like a generic "something went
  // wrong." With body.code now flowing through the envelope, the status
  // fallback only matters when the body is malformed or comes from a
  // non-AppError path (NestJS framework exception). NETWORK is the safer
  // 503 default — it tells the user to retry; codes that ride on top
  // (UPLOAD_FAILED, PAYMENT_PROVIDER_UNAVAILABLE) override via body.code.
  503: 'NETWORK',
};

/**
 * G1: the contract's AppErrorCode union. We accept any value the server
 * sends in body.code, but only known codes get a SAFE_MESSAGES entry —
 * unknown codes fall back to status-code mapping so a forward-compatible
 * older client never crashes on a newer-server code.
 */
const KNOWN_APP_CODES: ReadonlySet<AppErrorCode> = new Set<AppErrorCode>([
  'VALIDATION',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'NETWORK',
  'UNKNOWN',
  'UPLOAD_FAILED',
  'PAYMENT_PROVIDER_UNAVAILABLE',
  'ACADEMY_SETUP_REQUIRED',
  'COOLDOWN_ACTIVE',
  'SUBSCRIPTION_BLOCKED',
  'FEATURE_DISABLED',
]);

/**
 * Safe fallback messages for each error code.
 * Used when server message is missing or when we shouldn't expose it.
 */
const SAFE_MESSAGES: Record<AppErrorCode, string> = {
  VALIDATION: 'Please check your input and try again.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission for this action.',
  NOT_FOUND: 'The requested resource was not found.',
  CONFLICT: 'This action conflicts with the current state.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  NETWORK: 'Unable to connect. Please check your internet connection and try again.',
  UNKNOWN:
    'Something unexpected happened. Please try again or contact support if the issue persists.',
  // G1 mobile-alignment fix: messages for the new contract codes. These
  // are safe defaults — backend always writes a more specific message
  // and the passthrough set below means we prefer the server copy.
  UPLOAD_FAILED: 'Failed to upload. Please try again.',
  PAYMENT_PROVIDER_UNAVAILABLE:
    'Payment service is temporarily unavailable. Please try again in a moment.',
  ACADEMY_SETUP_REQUIRED: 'Please complete academy setup before continuing.',
  COOLDOWN_ACTIVE: 'Please wait before retrying.',
  SUBSCRIPTION_BLOCKED: 'Your academy subscription is not active. Renew to continue.',
  FEATURE_DISABLED: 'This feature is currently unavailable.',
};

/** Codes where we trust the server-provided message for display. */
const PASSTHROUGH_CODES = new Set<AppErrorCode>([
  'VALIDATION',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  // G1: pass server copy for the new codes too — the backend writes the
  // real user-facing message and the safe fallback is only useful when
  // it's missing.
  'UPLOAD_FAILED',
  'PAYMENT_PROVIDER_UNAVAILABLE',
  'ACADEMY_SETUP_REQUIRED',
  'COOLDOWN_ACTIVE',
  'SUBSCRIPTION_BLOCKED',
  'FEATURE_DISABLED',
]);

const MAX_MESSAGE_LENGTH = 500;

/**
 * Parse the `details` array from an API validation error response.
 *
 * NestJS class-validator returns messages like:
 *   "email must be an email"
 *   "password should not be empty"
 *   "guardian.name must be a string"
 *
 * The field name is the first token before " must", " should", " is ", " has ", etc.
 * For nested fields like "guardian.name", we take the last segment.
 */
function extractFieldErrors(details: unknown[]): Record<string, string> | undefined {
  const fieldErrors: Record<string, string> = {};

  for (const detail of details) {
    if (typeof detail !== 'string') continue;

    // Match: "fieldName <constraint message>"
    const match = detail.match(/^([a-zA-Z0-9_.[\\]-]+)\s+(.+)$/);
    if (match) {
      const rawField = match[1]!;
      const constraintMessage = match[2]!;
      // For nested fields like "guardian.name", use "name" for form field matching,
      // but also store the full path so either can match.
      const shortField = rawField.includes('.') ? rawField.split('.').pop()! : rawField;

      // Capitalize the constraint message for display
      const displayMessage = constraintMessage.charAt(0).toUpperCase() + constraintMessage.slice(1);

      // Store under both the short and full field name
      if (!fieldErrors[shortField]) {
        fieldErrors[shortField] = displayMessage;
      }
      if (rawField !== shortField && !fieldErrors[rawField]) {
        fieldErrors[rawField] = displayMessage;
      }
    } else {
      // If we can't parse the field name, store under a generic key
      if (!fieldErrors['_general']) {
        fieldErrors['_general'] = detail.slice(0, MAX_MESSAGE_LENGTH);
      }
    }
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

/**
 * Build a human-readable summary from the details array for display
 * in InlineError or Alert when field-level mapping isn't used.
 */
function buildDetailsSummary(details: unknown[]): string | undefined {
  const messages = details
    .filter((d): d is string => typeof d === 'string')
    .map((d) => {
      // Capitalize first letter for nicer display
      return d.charAt(0).toUpperCase() + d.slice(1);
    });

  if (messages.length === 0) return undefined;
  if (messages.length === 1) return messages[0]!;
  // Join multiple errors with bullet points
  return messages.map((m) => `\u2022 ${m}`).join('\n');
}

export function mapHttpError(
  status: number,
  body: unknown,
  retryAfterHeader?: string | null,
  requestId?: string | null,
): AppError {
  // G1 mobile-alignment fix: prefer the typed AppError code emitted in the
  // response envelope. The status-code path only fires when the body is
  // malformed or comes from a non-AppError exception (NestJS framework
  // path, e.g. DTO validation, which doesn't carry our typed code). This
  // also lets the same HTTP status carry distinct semantics — 503 might
  // be NETWORK (retryable) or UPLOAD_FAILED (terminal); only body.code
  // distinguishes them.
  let serverCode: AppErrorCode | undefined;
  if (body && typeof body === 'object') {
    const rawCode = (body as Record<string, unknown>)['code'];
    if (typeof rawCode === 'string' && KNOWN_APP_CODES.has(rawCode as AppErrorCode)) {
      serverCode = rawCode as AppErrorCode;
    }
  }
  const code: AppErrorCode = serverCode ?? STATUS_MAP[status] ?? 'UNKNOWN';

  let serverMessage: string | undefined;
  let fieldErrors: Record<string, string> | undefined;

  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;

    if (typeof b['message'] === 'string') {
      serverMessage = b['message'];
    } else if (typeof b['error'] === 'string') {
      serverMessage = b['error'];
    }

    // Extract field-level errors from the `details` array
    if (Array.isArray(b['details']) && b['details'].length > 0) {
      fieldErrors = extractFieldErrors(b['details']);

      // Build a descriptive message from the details instead of the generic
      // "Validation failed" that the API sends as the top-level message.
      const summary = buildDetailsSummary(b['details']);
      if (summary) {
        serverMessage = summary;
      }
    }
  }

  // For known client errors, use the server message if available.
  // For unknown/server errors, always use the safe fallback to prevent leaking internals.
  let message: string;
  if (PASSTHROUGH_CODES.has(code) && serverMessage) {
    message = serverMessage.slice(0, MAX_MESSAGE_LENGTH);
  } else {
    message = SAFE_MESSAGES[code];
  }

  const retryAfterSeconds = code === 'RATE_LIMITED' ? parseRetryAfter(retryAfterHeader) : undefined;

  // Prefer the server's X-Request-Id response header; fall back to the
  // `requestId` field the NestJS error envelope emits.
  const rid =
    requestId ??
    (body &&
    typeof body === 'object' &&
    typeof (body as Record<string, unknown>)['requestId'] === 'string'
      ? ((body as Record<string, unknown>)['requestId'] as string)
      : undefined);

  return { code, message, fieldErrors, retryAfterSeconds, requestId: rid };
}

// Retry-After is either delta-seconds or an HTTP-date per RFC 7231.
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
