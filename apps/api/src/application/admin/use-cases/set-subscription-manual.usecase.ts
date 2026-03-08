import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import { Subscription } from '@domain/subscription/entities/subscription.entity';
import { AdminErrors } from '../../common/errors';
import type { TierKey } from '@playconnect/contracts';

interface SetSubscriptionManualInput {
  actorRole: string;
  academyId: string;
  paidStartAt: string; // ISO date
  paidEndAt: string; // ISO date
  tierKey: TierKey;
  paymentReference?: string;
  manualNotes?: string;
}

export class SetSubscriptionManualUseCase {
  constructor(private readonly subscriptionRepo: SubscriptionRepository) {}

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

    if (paidStartAt >= paidEndAt) {
      return err(AdminErrors.invalidDates());
    }

    const updated = Subscription.reconstitute(sub.id.toString(), {
      ...sub['props'],
      paidStartAt,
      paidEndAt,
      tierKey: input.tierKey,
      paymentReference: input.paymentReference ?? sub.paymentReference,
      manualNotes: input.manualNotes ?? sub.manualNotes,
      audit: updateAuditFields(sub.audit),
    });

    await this.subscriptionRepo.save(updated);
    return ok(undefined);
  }
}
