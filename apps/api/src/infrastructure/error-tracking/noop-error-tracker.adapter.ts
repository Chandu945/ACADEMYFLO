import { Injectable } from '@nestjs/common';
import type { ErrorTrackerPort } from '@application/common/ports/error-tracker.port';

@Injectable()
export class NoopErrorTrackerAdapter implements ErrorTrackerPort {
  captureException(_error: unknown, _context?: Record<string, unknown>): void {
    // No-op: placeholder for future error tracking integration (e.g., Sentry)
  }
}
