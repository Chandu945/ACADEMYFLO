import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import { Subscription } from '@domain/subscription/entities/subscription.entity';
import { AdminErrors } from '../../common/errors';

interface DeactivateSubscriptionInput {
  actorRole: string;
  academyId: string;
  manualNotes?: string;
}

export class DeactivateSubscriptionUseCase {
  constructor(private readonly subscriptionRepo: SubscriptionRepository) {}

  async execute(input: DeactivateSubscriptionInput): Promise<Result<void, AppError>> {
    if (input.actorRole !== 'SUPER_ADMIN') {
      return err(AdminErrors.notSuperAdmin());
    }

    const sub = await this.subscriptionRepo.findByAcademyId(input.academyId);
    if (!sub) {
      return err(AdminErrors.subscriptionNotFound(input.academyId));
    }

    // Set paidEndAt to now to immediately expire, clear trial end too
    const now = new Date();
    const updated = Subscription.reconstitute(sub.id.toString(), {
      ...sub['props'],
      paidStartAt: sub.paidStartAt,
      paidEndAt: sub.paidEndAt ? new Date(Math.min(sub.paidEndAt.getTime(), now.getTime())) : null,
      trialEndAt: new Date(Math.min(sub.trialEndAt.getTime(), now.getTime())),
      manualNotes: input.manualNotes ?? sub.manualNotes,
      audit: updateAuditFields(sub.audit),
    });

    await this.subscriptionRepo.save(updated);
    return ok(undefined);
  }
}
