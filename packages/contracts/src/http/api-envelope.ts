/** Standard success response envelope */
export type ApiSuccess<T> = {
  success: true;
  data: T;
  requestId: string;
  /** ISO-8601 timestamp */
  timestamp: string;
};

/** Structured validation error detail */
export type ValidationErrorDetail = {
  field: string;
  message: string;
  value?: unknown;
};

/** Standard error response envelope (matches global exception filter) */
export type ApiError = {
  success: false;
  statusCode: number;
  error: string;
  message: string;
  path: string;
  method: string;
  /** ISO-8601 timestamp */
  timestamp: string;
  requestId: string;
  details: ValidationErrorDetail[];
};

/** Union of success and error envelopes */
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
