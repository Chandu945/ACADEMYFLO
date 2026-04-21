import * as Sentry from '@sentry/react-native';
import type { ErrorReporter } from '../../presentation/components/system/AppErrorBoundary';
import { env } from '../env';

declare const __DEV__: boolean;

/**
 * Sentry integration for crash reporting and performance.
 *
 * Call `initSentry()` once at module load (top of App.tsx, before any other
 * imports are evaluated) so unhandled errors at app startup are still
 * captured. Then pass `sentryReporter` to `setErrorReporter(...)` so the
 * app's error boundary routes caught React errors through Sentry.
 *
 * Events are scrubbed for PII (email + phone) via the `beforeSend` hook
 * before they leave the device, matching the same policy applied to
 * Cashfree error logs on the backend.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// E.164 (+91XXXXXXXXXX) and Indian 10-digit mobile (6-9 leading).
const E164_PHONE_REGEX = /\+\d{10,15}\b/g;
const IN_MOBILE_REGEX = /\b[6-9]\d{9}\b/g;

function redactPII(text: string): string {
  return text
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(E164_PHONE_REGEX, '[REDACTED_PHONE]')
    .replace(IN_MOBILE_REGEX, '[REDACTED_PHONE]');
}

/** Recursively scrub any string values in an object. Returns a new copy. */
function scrubValue(value: unknown): unknown {
  if (typeof value === 'string') return redactPII(value);
  if (Array.isArray(value)) return value.map(scrubValue);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = scrubValue(v);
    }
    return out;
  }
  return value;
}

/**
 * Initialize Sentry. Safe to call multiple times — Sentry guards against
 * re-init internally.
 *
 * In development, Sentry is NOT enabled by default: dev crashes would flood
 * the dashboard and burn quota. The existing console.error path in
 * AppErrorBoundary still runs in dev.
 */
export function initSentry(): void {
  if (__DEV__) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.APP_ENV,

    // Privacy defaults — deliberately overriding the wizard template:
    //
    // sendDefaultPii: false — do NOT let Sentry auto-capture IP addresses,
    // cookies, or user identifiers. The app handles parent/student data
    // subject to India's DPDP Act; we opt IN to PII only where we need it,
    // not OUT of the defaults.
    sendDefaultPii: false,

    // Console log piping is OFF by default on this SDK version (the wizard
    // template's `enableLogs: true` was an explicit opt-in we are not
    // re-enabling). We already have structured error reporting; console
    // logs would add noise and risk PII leaks.

    // Session Replay intentionally NOT enabled. It captures screen content
    // which in this app includes student names, phones, fees, attendance.
    // Turn it back on only after every sensitive screen has been audited
    // and explicit masking configured.
    //
    // (No `integrations: [Sentry.mobileReplayIntegration(), ...]` line.)

    // Capture breadcrumbs for navigation and network — invaluable for
    // reconstructing what the user did before the crash. These do not
    // include request/response bodies, only URL + status.
    enableAutoSessionTracking: true,

    // Sample rate 1.0 = capture every error. Reduce if quota becomes an
    // issue at scale.
    sampleRate: 1.0,

    // Performance monitoring (transactions). Low sample rate is a reasonable
    // default; turn up if diagnosing a specific latency issue.
    tracesSampleRate: 0.1,

    beforeSend(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
      // Strip PII from event fields before transmission.
      if (event.message) event.message = redactPII(event.message);
      if (event.extra) event.extra = scrubValue(event.extra) as typeof event.extra;
      if (event.tags) event.tags = scrubValue(event.tags) as typeof event.tags;
      if (event.exception?.values) {
        event.exception.values = event.exception.values.map((v: Sentry.Exception) => ({
          ...v,
          value: v.value ? redactPII(v.value) : v.value,
        }));
      }
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b: Sentry.Breadcrumb) => ({
          ...b,
          message: b.message ? redactPII(b.message) : b.message,
          data: b.data ? (scrubValue(b.data) as typeof b.data) : b.data,
        }));
      }
      return event;
    },
  });
}

/**
 * Adapter that plugs Sentry into the AppErrorBoundary's ErrorReporter
 * interface. Pass this to `setErrorReporter(...)` during app init.
 */
export const sentryReporter: ErrorReporter = {
  captureException(error, context) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  },
};
