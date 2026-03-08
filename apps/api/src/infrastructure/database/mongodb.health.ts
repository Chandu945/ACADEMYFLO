import { Injectable, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppConfigService } from '../../shared/config/config.service';

export type MongoHealthStatus = 'up' | 'down' | 'not_configured';

@Injectable()
export class MongoDbHealthIndicator {
  constructor(
    private readonly config: AppConfigService,
    @Optional() @InjectConnection() private readonly connection?: Connection,
  ) {}

  async check(): Promise<MongoHealthStatus> {
    if (!this.config.mongodbUri) {
      return 'not_configured';
    }

    if (!this.connection) {
      return 'not_configured';
    }

    try {
      if (this.connection.readyState === 1) {
        await this.connection.db?.admin().ping();
        return 'up';
      }
      return 'down';
    } catch {
      return 'down';
    }
  }
}
