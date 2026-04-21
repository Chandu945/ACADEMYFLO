import type { Result } from '@shared/kernel';
import { ok, err, updateAuditFields } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import { Subscription } from '@domain/subscription/entities/subscription.entity';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { AuditRecorderPort } from '../../audit/ports/audit-recorder.port';
import type { EmailSenderPort } from '../../notifications/ports/email-sender.port';
import { renderSubscriptionDeactivatedEmail } from '../../notifications/templates/subscription-deactivated-template';
import { AdminErrors } from '../../common/errors';

interface DeactivateSubscriptionInput {
  actorRole: string;
  actorUserId: string;
  academyId: string;
  manualNotes?: string;
}

export class DeactivateSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly auditRecorder: AuditRecorderPort,
    private readonly emailSender?: EmailSenderPort,
    private readonly userRepo?: UserRepository,
    private readonly academyRepo?: AcademyRepository,
  ) {}

  async execute(input: DeactivateSubscriptionInput): Promise<Result<void, AppError>> {
    if (input.actorRole !== 'SUPER_ADMIN') {
      return err(AdminErrors.notSuperAdmin());
    }

    const sub = await this.subscriptionRepo.findByAcademyId(input.academyId);
    if (!sub) {
      return err(AdminErrors.subscriptionNotFound(input.academyId));
    }

    // Capture previous values for audit context before overwrite.
    const previousPaidEndAt = sub.paidEndAt?.toISOString() ?? '';
    const previousTrialEndAt = sub.trialEndAt.toISOString();

    // Set paidEndAt to now to immediately expire, clear trial end too
    const now = new Date();
    const newPaidEndAt = sub.paidEndAt
      ? new Date(Math.min(sub.paidEndAt.getTime(), now.getTime()))
      : null;
    const newTrialEndAt = new Date(Math.min(sub.trialEndAt.getTime(), now.getTime()));

    const updated = Subscription.reconstitute(sub.id.toString(), {
      academyId: sub.academyId,
      trialStartAt: sub.trialStartAt,
      trialEndAt: newTrialEndAt,
      paidStartAt: sub.paidStartAt,
      paidEndAt: newPaidEndAt,
      tierKey: sub.tierKey,
      pendingTierKey: sub.pendingTierKey,
      pendingTierEffectiveAt: sub.pendingTierEffectiveAt,
      activeStudentCountSnapshot: sub.activeStudentCountSnapshot,
      peakStudentCountThisCycle: sub.peakStudentCountThisCycle,
      manualNotes: input.manualNotes ?? sub.manualNotes,
      paymentReference: sub.paymentReference,
      audit: updateAuditFields(sub.audit),
    });

    await this.subscriptionRepo.save(updated);

    await this.auditRecorder.record({
      academyId: input.academyId,
      actorUserId: input.actorUserId,
      action: 'ADMIN_SUBSCRIPTION_DEACTIVATED',
      entityType: 'SUBSCRIPTION',
      entityId: sub.id.toString(),
      context: {
        previousPaidEndAt,
        previousTrialEndAt,
        newPaidEndAt: newPaidEndAt?.toISOString() ?? '',
        newTrialEndAt: newTrialEndAt.toISOString(),
      },
    });

    // Fire-and-forget: notify academy owner about subscription deactivation
    if (this.emailSender && this.userRepo && this.academyRepo) {
      const academy = await this.academyRepo.findById(input.academyId);
      if (academy) {
        const owner = await this.userRepo.findById(academy.ownerUserId);
        if (owner) {
          this.emailSender.send({
            to: owner.emailNormalized,
            subject: 'Subscription Deactivated - ' + academy.academyName,
            html: renderSubscriptionDeactivatedEmail({
              ownerName: owner.fullName,
              academyName: academy.academyName,
            }),
          }).catch(() => {});
        }
      }
    }

    return ok(undefined);
  }
}
