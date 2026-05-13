/**
 * Cross-tier error code surface. API throws AppError instances with one of
 * these codes; the result-mapper turns them into HTTP responses with a
 * matching status; the mobile error-mapper turns them back into typed
 * AppError values for display. Codes that aren't in this union but appear
 * in the response body fall back to status-code mapping on the client.
 *
 * Keep this list in sync with `apps/api/src/presentation/http/common/result-mapper.ts`
 * ERROR_STATUS_MAP — the union is the source of truth for what the wire
 * may carry, the result-mapper decides the HTTP status, and the mobile
 * error-mapper decides the display copy.
 */
export type AppErrorCode =
  | 'UNAUTHORIZED'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'UNKNOWN'
  // G1 mobile-alignment fix: backend already throws these codes, but they
  // weren't in the contract — the mobile error-mapper fell back to UNKNOWN
  // and showed a generic message instead of the actual server message.
  /** Storage upload terminally failed (R2/S3 hiccup, permissions). Mobile
   *  surfaces this as a non-retryable user-facing error. */
  | 'UPLOAD_FAILED'
  /** Cashfree (or future payment-gateway) unavailable. Distinct from
   *  RATE_LIMITED — retrying immediately won't help. */
  | 'PAYMENT_PROVIDER_UNAVAILABLE'
  /** Action requires an academy and the user hasn't completed setup yet.
   *  Mobile routes this to the setup screen. */
  | 'ACADEMY_SETUP_REQUIRED'
  /** OTP / password-reset cooldown is active. Mobile shows the wait-time
   *  message and disables the action briefly. */
  | 'COOLDOWN_ACTIVE'
  /** Academy's subscription is BLOCKED (post-trial / payment failed).
   *  Mobile routes to the renew-subscription flow. */
  | 'SUBSCRIPTION_BLOCKED'
  /** Feature gated off (admin force-disable, beta gate). User-actionable
   *  only by contacting support. */
  | 'FEATURE_DISABLED';
