import type { Result } from '@shared/kernel';
import { ok } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { Subscription } from '@domain/subscription/entities/subscription.entity';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { ClockPort } from '../../common/clock.port';
import type { EmailSenderPort } from '../../notifications/ports/email-sender.port';
import { renderTrialStartedEmail } from '../../notifications/templates/trial-started-template';
import { formatIstDate } from '@shared/utils/date-format';
import { TRIAL_DURATION_DAYS } from '@academyflo/contracts';
import { randomUUID } from 'crypto';

export interface CreateTrialOutput {
  subscriptionId: string;
  trialStartAt: string;
  trialEndAt: string;
}

export class CreateTrialSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly clock: ClockPort,
    private readonly emailSender?: EmailSenderPort,
    private readonly userRepo?: UserRepository,
    private readonly academyRepo?: AcademyRepository,
  ) {}

  async execute(academyId: string): Promise<Result<CreateTrialOutput, AppError>> {
    // Idempotent: if subscription already exists, return it
    const existing = await this.subscriptionRepo.findByAcademyId(academyId);
    if (existing) {
      return ok({
        subscriptionId: existing.id.toString(),
        trialStartAt: existing.trialStartAt.toISOString(),
        trialEndAt: existing.trialEndAt.toISOString(),
      });
    }

    const now = this.clock.now();
    const trialEndAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const subscription = Subscription.createTrial({
      id: randomUUID(),
      academyId,
      trialStartAt: now,
      trialEndAt,
    });

    // M3 fix (subscription audit): handle the concurrent first-load race.
    // get-my-subscription auto-heals a missing subscription by calling here.
    // Two concurrent first-load requests (e.g. owner opens two tabs) both
    // pass the findByAcademyId(null) check at the top and race to insert.
    // The unique academyId index catches the loser with 11000; pre-fix code
    // let that bubble as a 500. Now we treat it as idempotent: re-fetch
    // and return the winning row. Email + audit are intentionally skipped
    // on the loser — the winner already (or will) send them.
    try {
      await this.subscriptionRepo.save(subscription);
    } catch (error) {
      const isDuplicate = (error as { code?: number })?.code === 11000;
      if (!isDuplicate) throw error;
      const winner = await this.subscriptionRepo.findByAcademyId(academyId);
      if (winner) {
        return ok({
          subscriptionId: winner.id.toString(),
          trialStartAt: winner.trialStartAt.toISOString(),
          trialEndAt: winner.trialEndAt.toISOString(),
        });
      }
      throw error;
    }

    // Fire-and-forget: notify academy owner about trial start (only for new trials)
    if (this.emailSender && this.userRepo && this.academyRepo) {
      const academy = await this.academyRepo.findById(academyId);
      const owner = academy ? await this.userRepo.findById(academy.ownerUserId) : null;
      if (owner && academy) {
        this.emailSender
          .send({
            to: owner.emailNormalized,
            subject: 'Your Free Trial Has Started - Academyflo',
            html: renderTrialStartedEmail({
              ownerName: owner.fullName,
              academyName: academy.academyName,
              // IST calendar date (not UTC) so owners see the same day they'd see on their phone.
              trialEndDate: formatIstDate(trialEndAt),
              trialDurationDays: TRIAL_DURATION_DAYS,
            }),
          })
          .catch(() => {});
      }
    }

    return ok({
      subscriptionId: subscription.id.toString(),
      trialStartAt: now.toISOString(),
      trialEndAt: trialEndAt.toISOString(),
    });
  }
}
