import type { LoggerPort } from '@shared/logging/logger.port';
import type { ExternalCallPolicyPort } from '@application/common/ports/external-call-policy.port';
import { redactPII } from '@shared/utils/redact-pii';

export interface CashfreeConfig {
  clientId: string;
  clientSecret: string;
  apiVersion: string;
  baseUrl: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_BACKOFF_MS = 500;
// Cap redacted error message length — long enough to preserve meaningful
// Cashfree error text, short enough to avoid log bloat.
const ERROR_MESSAGE_MAX_LEN = 200;

/** Parsed Cashfree error response fields — only known-safe keys. */
interface CashfreeErrorFields {
  code?: string;
  type?: string;
  message?: string;
}

/**
 * Low-level HTTP client for Cashfree PG API.
 * Handles auth headers, API versioning, and error mapping.
 * Wrapped with external call policy for timeout + bounded retry.
 */
export class CashfreeHttpClient {
  constructor(
    private readonly config: CashfreeConfig,
    private readonly logger: LoggerPort,
    private readonly callPolicy?: ExternalCallPolicyPort,
  ) {}

  async post<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
    const opName = `cashfree.post:${path}`;
    const doFetch = ({ signal }: { signal: AbortSignal }) => this.rawPost<T>(path, body, idempotencyKey, signal);

    if (this.callPolicy) {
      return this.callPolicy.run(opName, doFetch, {
        timeoutMs: DEFAULT_TIMEOUT_MS,
        retries: idempotencyKey ? 1 : 0,
        retryBackoffMs: DEFAULT_RETRY_BACKOFF_MS,
        idempotent: !!idempotencyKey,
      });
    }

    return doFetch({ signal: new AbortController().signal });
  }

  async get<T>(path: string): Promise<T> {
    const opName = `cashfree.get:${path}`;
    const doFetch = ({ signal }: { signal: AbortSignal }) => this.rawGet<T>(path, signal);

    if (this.callPolicy) {
      return this.callPolicy.run(opName, doFetch, {
        timeoutMs: DEFAULT_TIMEOUT_MS,
        retries: 1,
        retryBackoffMs: DEFAULT_RETRY_BACKOFF_MS,
        idempotent: true,
      });
    }

    return doFetch({ signal: new AbortController().signal });
  }

  private async rawPost<T>(path: string, body: unknown, idempotencyKey: string | undefined, signal: AbortSignal): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-client-id': this.config.clientId,
      'x-client-secret': this.config.clientSecret,
      'x-api-version': this.config.apiVersion,
    };

    if (idempotencyKey) {
      headers['x-idempotency-key'] = idempotencyKey;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      throw await this.handleErrorResponse(path, res);
    }

    return (await res.json()) as T;
  }

  private async rawGet<T>(path: string, signal: AbortSignal): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-client-id': this.config.clientId,
      'x-client-secret': this.config.clientSecret,
      'x-api-version': this.config.apiVersion,
    };

    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal,
    });

    if (!res.ok) {
      throw await this.handleErrorResponse(path, res);
    }

    return (await res.json()) as T;
  }

  /**
   * Read the error body, log a redacted structured summary, and return an
   * Error whose message is also redacted. Raw body bytes never reach logs
   * or thrown errors — only parsed `code`/`type` and a PII-scrubbed `message`.
   */
  private async handleErrorResponse(path: string, res: Response): Promise<Error> {
    const errorBody = await res.text().catch(() => '');
    const fields = this.parseCashfreeError(errorBody);
    const redactedMessage = fields.message
      ? redactPII(fields.message, ERROR_MESSAGE_MAX_LEN)
      : undefined;

    this.logger.error('Cashfree API error', {
      path,
      status: res.status,
      bodyBytes: errorBody.length,
      code: fields.code,
      type: fields.type,
      messageRedacted: redactedMessage,
    });

    const detailParts = [fields.code, fields.type, redactedMessage].filter(Boolean);
    const detail = detailParts.length > 0 ? detailParts.join(' — ') : 'Unknown error';
    return new Error(`Cashfree API error ${res.status}: ${detail}`);
  }

  /** Extract Cashfree's structured error fields. Returns empty object if not JSON. */
  private parseCashfreeError(raw: string): CashfreeErrorFields {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as CashfreeErrorFields;
      return {
        code: typeof parsed.code === 'string' ? parsed.code : undefined,
        type: typeof parsed.type === 'string' ? parsed.type : undefined,
        message: typeof parsed.message === 'string' ? parsed.message : undefined,
      };
    } catch {
      return {};
    }
  }
}
