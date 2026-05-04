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
