import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import { Subscription } from '@domain/subscription/entities/subscription.entity';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import { AdminErrors } from '../../common/errors';
import type { TierKey } from '@academyflo/contracts';

interface SetSubscriptionManualInput {
  actorRole: string;
  actorUserId: string;
  academyId: string;
  paidStartAt: string; // ISO date
  paidEndAt: string; // ISO date
  tierKey: TierKey;
  paymentReference?: string;
  manualNotes?: string;
}

export class SetSubscriptionManualUseCase {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly auditRecorder: AuditRecorderPort,
  ) {}

  async execute(input: SetSubscriptionManualInput): Promise<Result<void, AppError>> {
    if (input.actorRole !== 'SUPER_ADMIN') {
      return err(AdminErrors.notSuperAdmin());
    }

    const sub = await this.subscriptionRepo.findByAcademyId(input.academyId);
    if (!sub) {
      return err(AdminErrors.subscriptionNotFound(input.academyId));
    }

    const paidStartAt = new Date(input.paidStartAt);
    const paidEndAt = new Date(input.paidEndAt);

    // new Date('invalid') returns Invalid Date whose getTime() is NaN, and
    // all NaN comparisons are false — so `paidStartAt >= paidEndAt` would
    // silently pass. Reject malformed input explicitly.
    if (Number.isNaN(paidStartAt.getTime()) || Number.isNaN(paidEndAt.getTime())) {
      return err(AdminErrors.invalidDates());
    }
    if (paidStartAt >= paidEndAt) {
      return err(AdminErrors.invalidDates());
    }

    // Capture previous values for audit context before overwrite.
    const previousTierKey = sub.tierKey ?? '';
    const previousPaidStartAt = sub.paidStartAt?.toISOString() ?? '';
    const previousPaidEndAt = sub.paidEndAt?.toISOString() ?? '';

    const updated = Subscription.reconstitute(sub.id.toString(), {
      academyId: sub.academyId,
      trialStartAt: sub.trialStartAt,
      trialEndAt: sub.trialEndAt,
      paidStartAt,
      paidEndAt,
      tierKey: input.tierKey,
      pendingTierKey: sub.pendingTierKey,
      pendingTierEffectiveAt: sub.pendingTierEffectiveAt,
      activeStudentCountSnapshot: sub.activeStudentCountSnapshot,
      manualNotes: input.manualNotes ?? sub.manualNotes,
      paymentReference: input.paymentReference ?? sub.paymentReference,
      audit: updateAuditFields(sub.audit),
    });

    await this.subscriptionRepo.save(updated);

    await this.auditRecorder.record({
      academyId: input.academyId,
      actorUserId: input.actorUserId,
      action: 'ADMIN_SUBSCRIPTION_SET_MANUAL',
      entityType: 'SUBSCRIPTION',
      entityId: sub.id.toString(),
      context: {
        tierKey: input.tierKey,
        paidStartAt: paidStartAt.toISOString(),
        paidEndAt: paidEndAt.toISOString(),
        paymentReference: input.paymentReference ?? '',
        previousTierKey,
        previousPaidStartAt,
        previousPaidEndAt,
      },
    });

    return ok(undefined);
  }
}
