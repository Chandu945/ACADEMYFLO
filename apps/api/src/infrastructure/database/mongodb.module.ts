import { type DynamicModule, Module, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigService } from '../../shared/config/config.service';
import { MongoDbHealthIndicator } from './mongodb.health';
import { IndexVerifierService } from './index-verifier.service';
import { queryProfilerPlugin, setSlowQueryThreshold } from './query-profiler.plugin';

@Module({})
export class MongoDbModule {
  private static readonly logger = new Logger(MongoDbModule.name);

  static register(): DynamicModule {
    return {
      module: MongoDbModule,
      imports: [
        MongooseModule.forRootAsync({
          useFactory: (config: AppConfigService) => {
            const uri = config.mongodbUri;
            if (!uri) {
              MongoDbModule.logger.warn(
                'MONGODB_URI not configured — database features will be unavailable',
              );
            }

            setSlowQueryThreshold(config.slowQueryThresholdMs);

            return {
              uri: uri || 'mongodb://localhost:27017/__placeholder',
              retryAttempts: uri ? 3 : 0,
              retryDelay: 1000,
              lazyConnection: !uri,
              maxPoolSize: 100,
              minPoolSize: 20,
              maxIdleTimeMS: 30000,
              serverSelectionTimeoutMS: 5000,
              socketTimeoutMS: 45000,
              // readPreference: 'secondaryPreferred' routes read queries to replica secondaries
              // when available, reducing load on the primary. Falls back to primary if no
              // secondaries are reachable. Requires a MongoDB replica set deployment.
              readPreference: (config.mongodbReadPreference ?? 'secondaryPreferred') as 'primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest',
              connectionFactory: (connection: {
                plugin: (fn: typeof queryProfilerPlugin) => void;
              }) => {
                connection.plugin(queryProfilerPlugin);
                return connection;
              },
            };
          },
          inject: [AppConfigService],
        }),
      ],
      providers: [MongoDbHealthIndicator, IndexVerifierService],
      exports: [MongoDbHealthIndicator],
    };
  }

  static forTest(): DynamicModule {
    return {
      module: MongoDbModule,
      providers: [MongoDbHealthIndicator],
      exports: [MongoDbHealthIndicator],
    };
  }
}
