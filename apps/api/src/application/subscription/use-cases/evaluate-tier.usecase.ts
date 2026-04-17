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
import { TIER_PRICING_INR } from '@playconnect/contracts';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { EmailSenderPort } from '../../notifications/ports/email-sender.port';
import { renderPendingTierChangeEmail } from '../../notifications/templates/pending-tier-change-template';

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
    private readonly userRepo?: UserRepository,
    private readonly academyRepo?: AcademyRepository,
    private readonly emailSender?: EmailSenderPort,
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

    // Fire-and-forget: notify owner only when a new tier change is detected
    const hadPendingBefore = subscription.pendingTierKey !== null;
    if (pendingChange && !hadPendingBefore && this.emailSender && this.userRepo && this.academyRepo) {
      const academy = await this.academyRepo.findById(academyId);
      if (academy) {
        const owner = await this.userRepo.findById(academy.ownerUserId);
        if (owner) {
          this.emailSender.send({
            to: owner.emailNormalized,
            subject: 'Subscription Tier Change Required - ' + academy.academyName,
            html: renderPendingTierChangeEmail({
              ownerName: owner.fullName,
              academyName: academy.academyName,
              currentTier: currentTierKey ?? 'None',
              requiredTier: requiredTierKey,
              activeStudentCount,
              requiredTierPrice: TIER_PRICING_INR[requiredTierKey] ?? 0,
            }),
          }).catch(() => {});
        }
      }
    }

    return ok({
      activeStudentCount,
      requiredTierKey,
      currentTierKey,
      pendingTierKey: pendingChange?.tierKey ?? null,
      pendingTierEffectiveAt: pendingChange?.effectiveAt ?? null,
    });
  }
}
