import { Injectable, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import { ACADEMY_REPOSITORY } from '@domain/academy/ports/academy.repository';
import { EvaluateTierUseCase } from '@application/subscription/use-cases/evaluate-tier.usecase';
import type { LoggerPort } from '@shared/logging/logger.port';
import { LOGGER_PORT } from '@shared/logging/logger.port';

/**
 * Periodically re-evaluates the subscription tier for every academy so the
 * billing peak stays current even when owners don't trigger mutations.
 *
 * Why hourly?
 *   - Peak-based billing uses a 24h grace: a student record becomes eligible
 *     exactly 24h after creation. If we only evaluated on mutations, an owner
 *     who adds 60 students on day 1 then never touches the app would never
 *     see those students roll into the peak. Sampling hourly keeps the peak
 *     accurate within one hour of the grace window.
 *   - 60 evaluations/day × N academies is cheap: each call is a single
 *     count query + at most one write.
 */
@Injectable()
export class TierPeakEvaluationCronService {
  constructor(
    @Inject(ACADEMY_REPOSITORY)
    private readonly academyRepo: AcademyRepository,
    @Inject('EVALUATE_TIER_USE_CASE')
    private readonly evaluateTier: EvaluateTierUseCase,
    @Inject(LOGGER_PORT)
    private readonly logger: LoggerPort,
  ) {}

  /** Top of every hour. */
  @Cron('0 * * * *', { timeZone: 'Asia/Kolkata' })
  async handlePeakEvaluation(): Promise<void> {
    const start = Date.now();
    let evaluated = 0;
    let failed = 0;

    try {
      const academyIds = await this.academyRepo.findAllIds();
      for (const academyId of academyIds) {
        try {
          const result = await this.evaluateTier.execute(academyId);
          if (result.ok) {
            evaluated++;
          } else {
            failed++;
          }
        } catch (err) {
          failed++;
          this.logger.warn('Tier peak evaluation failed for academy', {
            academyId,
            error: (err as Error).message,
          });
        }
      }

      this.logger.info('Tier peak evaluation cron completed', {
        academiesScanned: academyIds.length,
        evaluated,
        failed,
        durationMs: Date.now() - start,
      });
    } catch (err) {
      this.logger.error('Tier peak evaluation cron crashed', {
        error: (err as Error).message,
      });
    }
  }
}
