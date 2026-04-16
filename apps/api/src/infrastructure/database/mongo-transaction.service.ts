import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import type { TransactionPort } from '@application/common/transaction.port';
import { runInTransaction } from './transaction-context';

// Per MongoDB driver docs, operations that fail with a `TransientTransactionError`
// or `UnknownTransactionCommitResult` label are safe to retry in a new transaction.
// Cap at 3 attempts with short backoff so a pathological conflict cannot keep a
// request hanging.
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [0, 50, 150] as const;

@Injectable()
export class MongoTransactionService implements TransactionPort {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (attempt > 1) {
        await delay(BACKOFF_MS[attempt - 1] ?? 0);
      }
      const session = await this.connection.startSession();
      try {
        // MongoDB requires all reads inside a transaction to target the primary.
        // The connection default is `secondaryPreferred`, so without this override
        // Mongo throws: "Read preference in a transaction must be primary".
        session.startTransaction({ readPreference: 'primary' });
        const result = await runInTransaction(session, fn);
        await session.commitTransaction();
        return result;
      } catch (error) {
        lastError = error;
        if (session.inTransaction()) {
          await session.abortTransaction().catch(() => {
            // best-effort; surface the original error instead
          });
        }
        if (attempt < MAX_ATTEMPTS && hasTransientLabel(error)) {
          continue;
        }
        throw error;
      } finally {
        await session.endSession();
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Transaction failed');
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasTransientLabel(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const maybe = err as { hasErrorLabel?: (label: string) => boolean };
  if (typeof maybe.hasErrorLabel !== 'function') return false;
  return (
    maybe.hasErrorLabel('TransientTransactionError') ||
    maybe.hasErrorLabel('UnknownTransactionCommitResult')
  );
}
