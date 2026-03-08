import type { Result } from '@shared/kernel';
import { ok, err, AppError } from '@shared/kernel';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import type { ActiveStudentCounterPort } from '../ports/active-student-counter.port';
import type { ClockPort } from '../../common/clock.port';
import { Subscription } from '@domain/subscription/entities/subscription.entity';
import {
  requiredTierForCount,
  computePendingTierChange,
} from '@domain/subscription/rules/subscription-tier.rules';
import type { TierKey } from '@playconnect/contracts';

export interface EvaluateTierOutput {
  activeStudentCount: number;
  requiredTierKey: TierKey;
  currentTierKey: TierKey | null;
  pendingTierKey: TierKey | null;
  pendingTierEffectiveAt: Date | null;
}

export class EvaluateTierUseCase {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly studentCounter: ActiveStudentCounterPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(academyId: string): Promise<Result<EvaluateTierOutput, AppError>> {
    const subscription = await this.subscriptionRepo.findByAcademyId(academyId);
    if (!subscription) {
      return err(AppError.notFound('Subscription'));
    }

    const now = this.clock.now();
    const activeStudentCount = await this.studentCounter.countActiveStudents(academyId, now);
    const requiredTierKey = requiredTierForCount(activeStudentCount);
    const currentTierKey = subscription.tierKey;

    const pendingChange = computePendingTierChange(
      currentTierKey,
      requiredTierKey,
      subscription.paidEndAt,
    );

    // Persist snapshot + pending tier info
    const updated = Subscription.reconstitute(subscription.id.toString(), {
      ...subscription['props'],
      pendingTierKey: pendingChange?.tierKey ?? null,
      pendingTierEffectiveAt: pendingChange?.effectiveAt ?? null,
      activeStudentCountSnapshot: activeStudentCount,
    });
    await this.subscriptionRepo.save(updated);

    return ok({
      activeStudentCount,
      requiredTierKey,
      currentTierKey,
      pendingTierKey: pendingChange?.tierKey ?? null,
      pendingTierEffectiveAt: pendingChange?.effectiveAt ?? null,
    });
  }
}
