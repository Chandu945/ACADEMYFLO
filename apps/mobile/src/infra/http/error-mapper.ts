import type { AppError, AppErrorCode } from '../../domain/common/errors';

const STATUS_MAP: Record<number, AppErrorCode> = {
  400: 'VALIDATION',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION',
  429: 'RATE_LIMITED',
  503: 'UNKNOWN',
};

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
  UNKNOWN: 'Something unexpected happened. Please try again or contact support if the issue persists.',
};

/** Codes where we trust the server-provided message for display. */
const PASSTHROUGH_CODES = new Set<AppErrorCode>([
  'VALIDATION',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
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
      const displayMessage =
        constraintMessage.charAt(0).toUpperCase() + constraintMessage.slice(1);

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

export function mapHttpError(status: number, body: unknown): AppError {
  const code: AppErrorCode = STATUS_MAP[status] ?? 'UNKNOWN';

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

  return { code, message, fieldErrors };
}
