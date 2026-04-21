import { Injectable, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExecuteAccountDeletionUseCase } from '@application/account-deletion/use-cases/execute-account-deletion.usecase';
import type { LoggerPort } from '@shared/logging/logger.port';
import { LOGGER_PORT } from '@shared/logging/logger.port';

@Injectable()
export class AccountDeletionSweeperCronService {
  constructor(
    private readonly executor: ExecuteAccountDeletionUseCase,
    @Inject(LOGGER_PORT) private readonly logger: LoggerPort,
  ) {}

  /** Run hourly at :15 — execute any deletion requests whose cooling-off has expired. */
  @Cron('15 * * * *', { timeZone: 'Asia/Kolkata' })
  async sweep(): Promise<void> {
    const result = await this.executor.sweep(new Date(), 50);
    if (result.processed > 0 || result.failed > 0 || result.timedOut > 0) {
      this.logger.info('Account deletion sweeper completed', {
        processed: result.processed,
        failed: result.failed,
        timedOut: result.timedOut,
      });
    }
  }
}
