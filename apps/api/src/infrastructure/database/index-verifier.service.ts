import { Injectable, type OnModuleInit, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppConfigService } from '@shared/config/config.service';
import { INDEX_SPEC, type IndexDefinition } from './index-spec';

@Injectable()
export class IndexVerifierService implements OnModuleInit {
  private readonly logger = new Logger(IndexVerifierService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly config: AppConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
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
