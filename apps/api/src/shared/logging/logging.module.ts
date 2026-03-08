import { Global, Module } from '@nestjs/common';
import { LOGGER_PORT } from './logger.port';
import { PinoLoggerService } from './pino-logger.service';
import { METRICS_PORT } from '@application/common/ports/metrics.port';
import { BasicMetricsAdapter } from '@infrastructure/metrics/basic-metrics.adapter';
import { ERROR_TRACKER_PORT } from '@application/common/ports/error-tracker.port';
import { NoopErrorTrackerAdapter } from '@infrastructure/error-tracking/noop-error-tracker.adapter';

@Global()
@Module({
  providers: [
    { provide: LOGGER_PORT, useClass: PinoLoggerService },
    { provide: METRICS_PORT, useClass: BasicMetricsAdapter },
    { provide: ERROR_TRACKER_PORT, useClass: NoopErrorTrackerAdapter },
  ],
  exports: [LOGGER_PORT, METRICS_PORT, ERROR_TRACKER_PORT],
})
export class LoggingModule {}
