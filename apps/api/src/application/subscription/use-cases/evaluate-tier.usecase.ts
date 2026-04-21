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
import type { TierKey } from '@academyflo/contracts';
import { TIER_PRICING_INR } from '@academyflo/contracts';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { EmailSenderPort } from '../../notifications/ports/email-sender.port';
import { renderPendingTierChangeEmail } from '../../notifications/templates/pending-tier-change-template';

/**
 * 24h grace window: a student counts toward the billing peak only after its
 * record has been active for at least this long. Protects against typos /
 * mis-added records that an owner corrects within minutes.
 */
const PEAK_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

export interface EvaluateTierOutput {
  activeStudentCount: number;
  eligibleStudentCount: number;
  peakStudentCount: number;
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

    // Current count — used only for the display snapshot.
    const activeStudentCount = await this.studentCounter.countActiveStudents(academyId, now);

    // Eligible count = active students whose record has existed for ≥24h. This
    // is what we bill on, to close the "add-then-remove right before renewal"
    // loophole while still tolerating typo corrections inside 24h.
    const eligibleStudentCount = await this.studentCounter.countEligibleStudents(
      academyId,
      now,
      PEAK_GRACE_PERIOD_MS,
    );

    // Peak never decreases within a cycle. Initialised on first evaluate of a
    // new cycle (via webhook handler) — fall back to current eligible here so
    // legacy rows without a peak set one on first read.
    const previousPeak = subscription.peakStudentCountThisCycle ?? eligibleStudentCount;
    const peakStudentCount = Math.max(previousPeak, eligibleStudentCount);

    const requiredTierKey = requiredTierForCount(peakStudentCount);
    const currentTierKey = subscription.tierKey;

    const pendingChange = computePendingTierChange(
      currentTierKey,
      requiredTierKey,
      subscription.paidEndAt,
    );

    const updated = Subscription.reconstitute(subscription.id.toString(), {
      ...subscription['props'],
      pendingTierKey: pendingChange?.tierKey ?? null,
      pendingTierEffectiveAt: pendingChange?.effectiveAt ?? null,
      activeStudentCountSnapshot: activeStudentCount,
      peakStudentCountThisCycle: peakStudentCount,
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
              activeStudentCount: peakStudentCount,
              requiredTierPrice: TIER_PRICING_INR[requiredTierKey] ?? 0,
            }),
          }).catch(() => {});
        }
      }
    }

    return ok({
      activeStudentCount,
      eligibleStudentCount,
      peakStudentCount,
      requiredTierKey,
      currentTierKey,
      pendingTierKey: pendingChange?.tierKey ?? null,
      pendingTierEffectiveAt: pendingChange?.effectiveAt ?? null,
    });
  }
}
