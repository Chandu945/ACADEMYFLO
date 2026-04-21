import type { Result } from '@shared/kernel';
import { ok, err, AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import type { SubscriptionPaymentRepository } from '@domain/subscription-payments/ports/subscription-payment.repository';
import type { ClockPort } from '../../common/clock.port';
import type { SubscriptionStatus, TierKey } from '@academyflo/contracts';
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
  /** Order id of the most recent PENDING payment for this academy, or null.
   *  Mobile / user-web use this to resume polling after an app-kill or tab
   *  close during a Cashfree checkout. Server-authoritative. */
  pendingPaymentOrderId: string | null;
}

export class GetMySubscriptionUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly academyRepo: AcademyRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly createTrial: CreateTrialSubscriptionUseCase,
    private readonly clock: ClockPort,
    private readonly studentCounter?: ActiveStudentCounterPort,
    private readonly paymentRepo?: SubscriptionPaymentRepository,
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

    // Compute tier info. Billing uses the peak (max eligible count across the
    // cycle, with a 24h grace for newly-added records) so owners can't avoid a
    // tier upgrade by flexing their student count down right before renewal.
    // `activeStudentCount` is the real-time count returned for display.
    const PEAK_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
    const activeStudentCount = this.studentCounter
      ? await this.studentCounter.countActiveStudents(academyId, now)
      : (subscription.activeStudentCountSnapshot ?? 0);
    const eligibleCount = this.studentCounter
      ? await this.studentCounter.countEligibleStudents(academyId, now, PEAK_GRACE_PERIOD_MS)
      : activeStudentCount;
    const peakStudentCount = Math.max(
      subscription.peakStudentCountThisCycle ?? eligibleCount,
      eligibleCount,
    );
    const requiredTier = requiredTierForCount(peakStudentCount);
    const pendingChange = computePendingTierChange(
      subscription.tierKey,
      requiredTier,
      subscription.paidEndAt,
    );

    // Projected tier assuming every current active student ends up eligible.
    // Differs from `requiredTier` only when there are students within the 24h
    // grace that would raise the tier once they mature. Lets the UI warn the
    // owner proactively: "6 students are in a 24h review. If they stay, your
    // tier will move to X at renewal."
    const projectedTier = requiredTierForCount(activeStudentCount);
    const studentsInGraceWindow = Math.max(0, activeStudentCount - eligibleCount);

    // Latest PENDING payment (if any) so mobile / web can resume polling
    // after a kill/close mid-checkout. Fail-open: if the lookup errors, we
    // simply don't offer resume — fresh payment still works.
    let pendingPaymentOrderId: string | null = null;
    if (this.paymentRepo) {
      try {
        const pending = await this.paymentRepo.findPendingByAcademyId(academyId);
        pendingPaymentOrderId = pending?.orderId ?? null;
      } catch {
        pendingPaymentOrderId = null;
      }
    }

    return ok({
      status: evaluation.status,
      trialEndAt: subscription.trialEndAt.toISOString(),
      paidEndAt: subscription.paidEndAt?.toISOString() ?? null,
      tierKey: subscription.tierKey,
      daysRemaining: evaluation.daysRemaining,
      canAccessApp: evaluation.canAccessApp,
      blockReason: evaluation.blockReason,
      activeStudentCount,
      peakStudentCount,
      studentsInGraceWindow,
      projectedTierKey: projectedTier,
      currentTierKey: subscription.tierKey,
      requiredTierKey: requiredTier,
      pendingTierChange: pendingChange
        ? { tierKey: pendingChange.tierKey, effectiveAt: pendingChange.effectiveAt.toISOString() }
        : null,
      tiers: TIER_TABLE,
      pendingPaymentOrderId,
    });
  }
}
