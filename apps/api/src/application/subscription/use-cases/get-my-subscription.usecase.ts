import type { Result } from '@shared/kernel';
import { ok, err, AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import type { ClockPort } from '../../common/clock.port';
import type { SubscriptionStatus, TierKey } from '@playconnect/contracts';
import { evaluateStatus } from './evaluate-subscription-status';
import type { CreateTrialSubscriptionUseCase } from './create-trial-subscription.usecase';
import type { ActiveStudentCounterPort } from '../ports/active-student-counter.port';
import {
  requiredTierForCount,
  computePendingTierChange,
  TIER_TABLE,
} from '@domain/subscription/rules/subscription-tier.rules';

export interface PendingTierChangeDto {
  tierKey: TierKey;
  effectiveAt: string;
}

export interface TierPricingDto {
  tierKey: TierKey;
  min: number;
  max: number | null;
  priceInr: number;
}

export interface SubscriptionSummary {
  status: SubscriptionStatus;
  trialEndAt: string;
  paidEndAt: string | null;
  tierKey: TierKey | null;
  daysRemaining: number;
  canAccessApp: boolean;
  blockReason: string | null;
  activeStudentCount: number;
  currentTierKey: TierKey | null;
  requiredTierKey: TierKey;
  pendingTierChange: PendingTierChangeDto | null;
  tiers: TierPricingDto[];
}

export class GetMySubscriptionUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly createTrial: CreateTrialSubscriptionUseCase,
    private readonly clock: ClockPort,
    private readonly studentCounter?: ActiveStudentCounterPort,
  ) {}

  async execute(userId: string): Promise<Result<SubscriptionSummary, AppError>> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      return err(AppError.notFound('User', userId));
    }

    // Resolve academy
    let academyId = user.academyId;
    let academy;

    if (academyId) {
      academy = await this.academyRepo.findById(academyId);
    }

    // Fallback for owners: lookup by ownerUserId
    if (!academy && user.role === 'OWNER') {
      academy = await this.academyRepo.findByOwnerUserId(userId);
      if (academy) {
        academyId = academy.id.toString();
      }
    }

    if (!academy || !academyId) {
      return err(new AppError('ACADEMY_SETUP_REQUIRED', 'Please complete academy setup first'));
    }

    // Load subscription — auto-heal if missing
    let subscription = await this.subscriptionRepo.findByAcademyId(academyId);
    if (!subscription) {
      await this.createTrial.execute(academyId);
      subscription = await this.subscriptionRepo.findByAcademyId(academyId);
    }

    if (!subscription) {
      return err(AppError.notFound('Subscription'));
    }

    const now = this.clock.now();
    const evaluation = evaluateStatus(now, academy.loginDisabled, subscription);

    // Compute tier info
    const activeStudentCount = this.studentCounter
      ? await this.studentCounter.countActiveStudents(academyId, now)
      : (subscription.activeStudentCountSnapshot ?? 0);
    const requiredTier = requiredTierForCount(activeStudentCount);
    const pendingChange = computePendingTierChange(
      subscription.tierKey,
      requiredTier,
      subscription.paidEndAt,
    );

    return ok({
      status: evaluation.status,
      trialEndAt: subscription.trialEndAt.toISOString(),
      paidEndAt: subscription.paidEndAt?.toISOString() ?? null,
      tierKey: subscription.tierKey,
      daysRemaining: evaluation.daysRemaining,
      canAccessApp: evaluation.canAccessApp,
      blockReason: evaluation.blockReason,
      activeStudentCount,
      currentTierKey: subscription.tierKey,
      requiredTierKey: requiredTier,
      pendingTierChange: pendingChange
        ? { tierKey: pendingChange.tierKey, effectiveAt: pendingChange.effectiveAt.toISOString() }
        : null,
      tiers: TIER_TABLE,
    });
  }
}
