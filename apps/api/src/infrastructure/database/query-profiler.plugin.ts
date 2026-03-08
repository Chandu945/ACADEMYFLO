import type { Schema } from 'mongoose';
import { Logger } from '@nestjs/common';
import { getRequestContext } from '@shared/context/request-context';

interface QueryWithTiming {
  _queryStart?: number;
  mongooseCollection?: { name: string };
  _collection?: { name: string };
  getFilter?: () => Record<string, unknown>;
}

const logger = new Logger('QueryProfiler');

let slowQueryThresholdMs = 200;

export function setSlowQueryThreshold(ms: number): void {
  slowQueryThresholdMs = ms;
}

/**
 * Mongoose plugin that logs queries exceeding the slow query threshold.
 * Attaches the requestId from AsyncLocalStorage for correlation.
 */
export function queryProfilerPlugin(schema: Schema): void {
  schema.pre('find', function () {
    (this as unknown as QueryWithTiming)._queryStart = Date.now();
  });

  schema.pre('findOne', function () {
    (this as unknown as QueryWithTiming)._queryStart = Date.now();
  });

  schema.pre('countDocuments', function () {
    (this as unknown as QueryWithTiming)._queryStart = Date.now();
  });

  schema.pre('aggregate', function () {
    (this as unknown as QueryWithTiming)._queryStart = Date.now();
  });

  schema.post('find', function (_result: unknown) {
    logIfSlow(this, 'find');
  });

  schema.post('findOne', function (_result: unknown) {
    logIfSlow(this, 'findOne');
  });

  schema.post('countDocuments', function (_result: unknown) {
    logIfSlow(this, 'countDocuments');
  });

  schema.post('aggregate', function (_result: unknown) {
    logIfSlow(this, 'aggregate');
  });
}

function logIfSlow(query: unknown, operation: string): void {
  const q = query as QueryWithTiming;
  const start = q._queryStart;
  if (!start) return;

  const durationMs = Date.now() - start;
  if (durationMs < slowQueryThresholdMs) return;

  const ctx = getRequestContext();
  const requestId = ctx?.requestId ?? 'no-context';
  const collection =
    q.mongooseCollection?.name ??
    q._collection?.name ??
    'unknown';

  const filter = typeof q.getFilter === 'function' ? JSON.stringify(q.getFilter()) : 'N/A';

  logger.warn(
    `Slow query: ${operation} on ${collection} took ${durationMs}ms (threshold: ${slowQueryThresholdMs}ms) [requestId=${requestId}] filter=${filter}`,
  );
}
