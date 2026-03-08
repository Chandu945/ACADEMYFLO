import {
  Injectable,
  Inject,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import type { LoggerPort } from '@shared/logging/logger.port';
import { LOGGER_PORT } from '@shared/logging/logger.port';
import type { MetricsPort } from '@application/common/ports/metrics.port';
import { METRICS_PORT } from '@application/common/ports/metrics.port';
import { getRequestId } from '@shared/logging/request-id.interceptor';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(LOGGER_PORT) private readonly logger: LoggerPort,
    @Inject(METRICS_PORT) private readonly metrics: MetricsPort,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logRequest(request, response.statusCode, start);
        },
        error: () => {
          this.logRequest(request, response.statusCode || 500, start);
        },
      }),
    );
  }

  private logRequest(request: Request, statusCode: number, start: number): void {
    const durationMs = Date.now() - start;
    const requestId = getRequestId(request);
    const method = request.method;
    const path = request.url;

    // Extract user context from JWT payload (set by JwtAuthGuard)
    const user = (request as unknown as Record<string, unknown>)['user'] as
      | { userId?: string; role?: string; academyId?: string }
      | undefined;

    const context: Record<string, unknown> = {
      requestId,
      method,
      path,
      statusCode,
      durationMs,
    };

    if (user?.userId) context['userId'] = user.userId;
    if (user?.role) context['role'] = user.role;

    const statusGroup = `${Math.floor(statusCode / 100)}xx`;
    this.metrics.incrementCounter('http_requests_total', { method, status: statusGroup });
    this.metrics.observeHistogram('http_request_duration_ms', durationMs, { method });

    if (statusCode >= 500) {
      this.logger.error('HTTP request completed', context);
    } else if (statusCode >= 400) {
      this.logger.warn('HTTP request completed', context);
    } else {
      this.logger.info('HTTP request completed', context);
    }
  }
}
