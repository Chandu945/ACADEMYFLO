import { Injectable, type OnModuleInit, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppConfigService } from '@shared/config/config.service';
import { INDEX_SPEC, type IndexDefinition } from './index-spec';

/**
 * Indexes that earlier schema versions created and that must be dropped on
 * startup because they are now incorrect (most commonly: a unique index that's
 * narrower than the current schema's unique key, blocking inserts that the
 * new schema considers legitimate).
 *
 * Mongoose auto-indexing creates new indexes from the schema but never drops
 * old ones, so without this list a deployed database carries forward stale
 * uniqueness constraints from previous releases.
 *
 * Keys must match exactly (same fields, same order, same direction).
 */
const LEGACY_INDEXES_TO_DROP: ReadonlyArray<{
  collection: string;
  keys: Record<string, 1 | -1>;
  /** Why we're dropping it — appears in the startup log. */
  reason: string;
}> = [
  {
    collection: 'studentAttendance',
    keys: { academyId: 1, studentId: 1, date: 1 },
    reason:
      'Pre-batch-aware unique index. Replaced by ' +
      '{academyId, studentId, batchId, date} so a student in two batches on ' +
      'the same day can have two PRESENT records.',
  },
];

@Injectable()
export class IndexVerifierService implements OnModuleInit {
  private readonly logger = new Logger(IndexVerifierService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly config: AppConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Legacy-index cleanup runs UNCONDITIONALLY (i.e. independent of
    // INDEX_ASSERTION_ENABLED). Each entry in LEGACY_INDEXES_TO_DROP is a
    // schema-migration step that must converge regardless of env config —
    // gating it behind a flag means a stale unique constraint can keep
    // blocking writes after the fix is deployed (which is exactly what
    // happened with the multi-batch attendance bug). The cleanup is
    // idempotent and only acts on indexes whose keys exactly match the
    // hardcoded list.
    await this.dropLegacyIndexes();

    // Pre-flight for the new partial-unique index on PENDING payment
    // requests. If the database already has duplicate PENDING rows for the
    // same fee due (a race that this very index is meant to prevent), Mongo
    // refuses to build the index and the API never finishes booting. Cancel
    // older duplicates first so the index can be created cleanly. Idempotent.
    await this.cancelDuplicatePendingPaymentRequests();

    // One-shot backfill: TransactionLog rows written before the
    // baseAmount/lateFeeAmount split was introduced have those fields null.
    // Derive them from the linked FeeDue so historical revenue aggregations
    // produce the same numbers regardless of when the row was written.
    // Idempotent: only touches rows where both fields are still null.
    await this.backfillTransactionLogSplit();

    if (!this.config.indexAssertionEnabled) {
      return;
    }

    this.logger.log('Verifying database indexes...');
    const missing = await this.verify();

    if (missing.length > 0) {
      const details = missing.map((m) => `  ${m.collection}: ${JSON.stringify(m.keys)}`).join('\n');
      this.logger.warn(`Missing indexes detected (${missing.length}):\n${details}`);
    } else {
      this.logger.log(`All ${INDEX_SPEC.length} indexes verified.`);
    }
  }

  /**
   * Drop indexes listed in LEGACY_INDEXES_TO_DROP if they're still present in
   * the database. Idempotent: a missing index is a no-op, not an error.
   */
  async dropLegacyIndexes(): Promise<void> {
    for (const legacy of LEGACY_INDEXES_TO_DROP) {
      try {
        const col = this.connection.db!.collection(legacy.collection);
        const existing = await col.indexes();
        const targetKey = JSON.stringify(legacy.keys);
        const match = existing.find((idx) => JSON.stringify(idx.key) === targetKey);
        if (!match) continue;

        const indexName = match.name as string | undefined;
        if (!indexName) continue;

        this.logger.warn(
          `Dropping legacy index ${legacy.collection}.${indexName} ` +
            `(${targetKey}) — ${legacy.reason}`,
        );
        await col.dropIndex(indexName);
      } catch (err) {
        // Don't fail startup if cleanup hits a transient error — the verifier
        // below will still surface any resulting mismatch as a warning.
        this.logger.warn(
          `Could not drop legacy index on ${legacy.collection}: ${(err as Error).message}`,
        );
      }
    }
  }

  /**
   * Pre-flight migration for the partial unique index on
   * `payment_requests.{feeDueId} where status='PENDING'`. Each fee due may
   * legitimately accumulate one PENDING row — historical re-attempts left
   * behind by the now-closed race may break that, so we keep the most-recent
   * PENDING row and CANCEL the rest. Idempotent: subsequent boots see a
   * clean state and exit early.
   */
  async cancelDuplicatePendingPaymentRequests(): Promise<void> {
    try {
      const col = this.connection.db!.collection('payment_requests');
      const dupes = await col
        .aggregate<{ _id: string; ids: { id: string; createdAt: Date }[] }>([
          { $match: { status: 'PENDING' } },
          {
            $group: {
              _id: '$feeDueId',
              ids: { $push: { id: '$_id', createdAt: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $match: { count: { $gt: 1 } } },
        ])
        .toArray();

      if (dupes.length === 0) return;

      let totalCancelled = 0;
      for (const group of dupes) {
        // Keep the most-recent PENDING row, cancel the rest. Most-recent is
        // the one the user most likely just submitted; older duplicates are
        // background noise from before the race fix.
        const sorted = [...group.ids].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
        const toCancel = sorted.slice(1).map((r) => r.id);
        if (toCancel.length === 0) continue;

        const result = await col.updateMany(
          { _id: { $in: toCancel as unknown as never[] }, status: 'PENDING' },
          {
            $set: {
              status: 'CANCELLED',
              rejectionReason: 'Duplicate pending request — auto-cancelled during migration',
              reviewedAt: new Date(),
              updatedAt: new Date(),
            },
          },
        );
        totalCancelled += result.modifiedCount ?? 0;
      }

      if (totalCancelled > 0) {
        this.logger.warn(
          `Auto-cancelled ${totalCancelled} duplicate PENDING payment_requests across ${dupes.length} fee dues to unblock the partial unique index.`,
        );
      }
    } catch (err) {
      // Non-fatal: if this fails the index creation will fail loudly which
      // surfaces the issue immediately. Logging makes the cause obvious.
      this.logger.warn(
        `Could not pre-flight duplicate PENDING payment_requests: ${(err as Error).message}`,
      );
    }
  }

  /**
   * One-shot backfill for TransactionLog principal/late-fee split. Older
   * rows have `baseAmount`/`lateFeeAmount` null because they predate the
   * split. Use the linked FeeDue's `amount` and `lateFeeApplied` to fill
   * them in so revenue reports and reconciliation aggregations have a
   * consistent shape. Idempotent: skipped on rows where both fields are
   * already set, and benign on rows whose linked FeeDue is missing
   * (those keep null).
   */
  async backfillTransactionLogSplit(): Promise<void> {
    try {
      const txCol = this.connection.db!.collection('transaction_logs');
      const dueCol = this.connection.db!.collection('fee_dues');

      const cursor = txCol.find(
        { $or: [{ baseAmount: null }, { lateFeeAmount: null }] },
        { projection: { _id: 1, feeDueId: 1, amount: 1 } },
      );
      let touched = 0;
      while (await cursor.hasNext()) {
        const tx = (await cursor.next()) as
          | { _id: unknown; feeDueId?: string; amount?: number }
          | null;
        if (!tx || !tx.feeDueId) continue;

        const due = (await dueCol.findOne(
          { _id: tx.feeDueId as unknown as never },
          { projection: { amount: 1, lateFeeApplied: 1 } },
        )) as { amount?: number; lateFeeApplied?: number } | null;
        if (!due || typeof due.amount !== 'number') continue;

        const lateFeeAmount = due.lateFeeApplied ?? 0;
        const baseAmount = due.amount;
        await txCol.updateOne(
          { _id: tx._id as never },
          { $set: { baseAmount, lateFeeAmount } },
        );
        touched += 1;
      }
      if (touched > 0) {
        this.logger.log(
          `Backfilled baseAmount/lateFeeAmount on ${touched} legacy transaction_logs rows.`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Could not backfill TransactionLog split fields: ${(err as Error).message}`,
      );
    }
  }

  async verify(): Promise<IndexDefinition[]> {
    const missing: IndexDefinition[] = [];

    const grouped = new Map<string, IndexDefinition[]>();
    for (const spec of INDEX_SPEC) {
      const list = grouped.get(spec.collection) ?? [];
      list.push(spec);
      grouped.set(spec.collection, list);
    }

    for (const [collection, specs] of grouped) {
      try {
        const col = this.connection.db!.collection(collection);
        const existing = await col.indexes();
        const existingKeys = existing.map((idx) => JSON.stringify(idx.key));

        for (const spec of specs) {
          const specKey = JSON.stringify(spec.keys);
          if (!existingKeys.includes(specKey)) {
            missing.push(spec);
          }
        }
      } catch {
        // Collection may not exist yet — treat all its indexes as missing
        missing.push(...specs);
      }
    }

    return missing;
  }
}
