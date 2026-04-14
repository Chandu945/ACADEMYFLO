import { Injectable, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { SessionRepository } from '@domain/identity/ports/session.repository';
import { SESSION_REPOSITORY } from '@domain/identity/ports/session.repository';
import type { LoggerPort } from '@shared/logging/logger.port';
import { LOGGER_PORT } from '@shared/logging/logger.port';

@Injectable()
export class SessionPurgeCronService {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepo: SessionRepository,
    @Inject(LOGGER_PORT)
    private readonly logger: LoggerPort,
  ) {}

  /** Run daily at 03:30 IST — purge all expired and revoked sessions. */
  @Cron('30 3 * * *', { timeZone: 'Asia/Kolkata' })
  async handleSessionPurge(): Promise<void> {
    const deleted = await this.sessionRepo.deleteExpiredAndRevoked();
    this.logger.info('Session purge cron completed', { deletedCount: deleted });
  }
}
