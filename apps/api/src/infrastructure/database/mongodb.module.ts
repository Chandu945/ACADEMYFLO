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
