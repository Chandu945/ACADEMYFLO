import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { EvaluateTierUseCase } from './evaluate-tier.usecase';
import type { LoggerPort } from '@shared/logging/logger.port';

export class RecomputePendingTiersUseCase {
  constructor(
    private readonly academyRepo: AcademyRepository,
    private readonly evaluateTier: EvaluateTierUseCase,
    private readonly logger: LoggerPort,
  ) {}

  async execute(): Promise<{ processed: number; errors: number }> {
    const academyIds = await this.academyRepo.findAllIds();
    let processed = 0;
    let errors = 0;

    for (const academyId of academyIds) {
      const result = await this.evaluateTier.execute(academyId);
      if (result.ok) {
        this.logger.info('Tier evaluation completed', {
          academyId,
          activeStudentCount: result.value.activeStudentCount,
          requiredTierKey: result.value.requiredTierKey,
          pendingTierKey: result.value.pendingTierKey ?? undefined,
        });
        processed++;
      } else {
        this.logger.error('Tier evaluation failed', {
          academyId,
          error: result.error.message,
        });
        errors++;
      }
    }

    return { processed, errors };
  }
}
