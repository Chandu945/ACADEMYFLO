import { Injectable, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import { ACADEMY_REPOSITORY } from '@domain/academy/ports/academy.repository';
import { EvaluateTierUseCase } from '@application/subscription/use-cases/evaluate-tier.usecase';
import type { LoggerPort } from '@shared/logging/logger.port';
import { LOGGER_PORT } from '@shared/logging/logger.port';
import { ConcurrentModificationError } from '@shared/errors/concurrent-modification.error';

// Cron races with live user requests (payments, approvals) that also write to
// the subscription doc. A single collision burned 31% of the 16-academy batch
// in prod logs. Three tries with jittered backoff reliably drains those
// collisions without looping forever if the conflict is something else.
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_BASE_MS = 100;

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
    let retried = 0;

    try {
      const academyIds = await this.academyRepo.findAllIds();
      for (const academyId of academyIds) {
        const outcome = await this.evaluateWithRetry(academyId);
        if (outcome.ok) {
          evaluated++;
          retried += outcome.attempts - 1;
        } else {
          failed++;
          retried += outcome.attempts - 1;
          this.logger.warn('Tier peak evaluation failed for academy', {
            academyId,
            attempts: outcome.attempts,
            error: outcome.error,
          });
        }
      }

      this.logger.info('Tier peak evaluation cron completed', {
        academiesScanned: academyIds.length,
        evaluated,
        failed,
        retried,
        durationMs: Date.now() - start,
      });
    } catch (err) {
      this.logger.error('Tier peak evaluation cron crashed', {
        error: (err as Error).message,
      });
    }
  }

  /**
   * Runs evaluateTier with retries scoped to ConcurrentModificationError.
   * Other errors (e.g. DB connection) bubble out on the first attempt since
   * retrying won't help.
   */
  private async evaluateWithRetry(
    academyId: string,
  ): Promise<{ ok: true; attempts: number } | { ok: false; attempts: number; error: string }> {
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const result = await this.evaluateTier.execute(academyId);
        if (result.ok) return { ok: true, attempts: attempt };
        // Domain-level failure (e.g. subscription not found) — no point retrying.
        return { ok: false, attempts: attempt, error: result.error.message };
      } catch (err) {
        const isConflict = err instanceof ConcurrentModificationError;
        if (!isConflict || attempt === MAX_RETRY_ATTEMPTS) {
          return { ok: false, attempts: attempt, error: (err as Error).message };
        }
        // Jittered exponential backoff lets the racing writer land before
        // we reload, so the next attempt starts from the post-write version.
        const base = RETRY_BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * base);
        await new Promise((resolve) => setTimeout(resolve, base + jitter));
      }
    }
    // Unreachable — loop always returns — but keeps TS happy without a cast.
    return { ok: false, attempts: MAX_RETRY_ATTEMPTS, error: 'exhausted retries' };
  }
}
