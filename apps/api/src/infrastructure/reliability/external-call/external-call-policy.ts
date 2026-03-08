import { Injectable, Inject } from '@nestjs/common';
import type {
  ExternalCallPolicyPort,
  ExternalCallOptions,
} from '@application/common/ports/external-call-policy.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import { LOGGER_PORT } from '@shared/logging/logger.port';
import { ExternalTimeoutError } from './timeout';
import { withRetry, isRetryable } from './retry';

export class ExternalUnavailableError extends Error {
  constructor(opName: string, cause?: unknown) {
    super(`External service '${opName}' is unavailable`);
    this.name = 'ExternalUnavailableError';
    if (cause instanceof Error) this.cause = cause;
  }
}

@Injectable()
export class ExternalCallPolicy implements ExternalCallPolicyPort {
  constructor(
    @Inject(LOGGER_PORT) private readonly logger: LoggerPort,
  ) {}

  async run<T>(
    opName: string,
    fn: (ctx: { signal: AbortSignal }) => Promise<T>,
    options: ExternalCallOptions,
  ): Promise<T> {
    this.logger.debug('externalCallStart', { opName });

    const effectiveRetries = options.idempotent ? Math.min(options.retries, 3) : 0;

    try {
      const result = await withRetry(
        () => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), options.timeoutMs);

          return fn({ signal: controller.signal })
            .catch((err) => {
              if (err instanceof Error && err.name === 'AbortError') {
                throw new ExternalTimeoutError(opName, options.timeoutMs);
              }
              throw err;
            })
            .finally(() => clearTimeout(timer));
        },
        {
          maxRetries: effectiveRetries,
          backoffMs: options.retryBackoffMs,
          idempotent: options.idempotent,
        },
        (attempt, error) => {
          this.logger.warn('externalCallRetry', {
            opName,
            attempt,
            error: error instanceof Error ? error.message : String(error),
          });
        },
      );

      return result;
    } catch (error) {
      if (error instanceof ExternalTimeoutError) {
        this.logger.error('externalCallTimeout', {
          opName,
          timeoutMs: options.timeoutMs,
        });
        throw error;
      }

      this.logger.error('externalCallFailed', {
        opName,
        error: error instanceof Error ? error.message : String(error),
      });

      if (isRetryable(error)) {
        throw new ExternalUnavailableError(opName, error);
      }

      throw error;
    }
  }
}
