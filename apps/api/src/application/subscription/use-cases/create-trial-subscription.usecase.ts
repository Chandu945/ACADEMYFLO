import type { Result } from '@shared/kernel';
import { ok } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import { Subscription } from '@domain/subscription/entities/subscription.entity';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import type { ClockPort } from '../../common/clock.port';
import { TRIAL_DURATION_DAYS } from '@playconnect/contracts';
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

    await this.subscriptionRepo.save(subscription);

    return ok({
      subscriptionId: subscription.id.toString(),
      trialStartAt: now.toISOString(),
      trialEndAt: trialEndAt.toISOString(),
    });
  }
}
