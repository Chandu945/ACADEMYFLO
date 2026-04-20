import { CreateTrialSubscriptionUseCase } from './create-trial-subscription.usecase';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import type { ClockPort } from '../../common/clock.port';
import { Subscription } from '@domain/subscription/entities/subscription.entity';
import { createAuditFields } from '@shared/kernel';
import { TRIAL_DURATION_DAYS } from '@academyflo/contracts';

const NOW = new Date('2025-06-15T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function buildDeps() {
  const subscriptionRepo: jest.Mocked<SubscriptionRepository> = {
    save: jest.fn(),
    findByAcademyId: jest.fn(),
  };
  const clock: ClockPort = { now: () => NOW };
  return { subscriptionRepo, clock };
}

describe('CreateTrialSubscriptionUseCase', () => {
  it('should create a trial subscription', async () => {
    const { subscriptionRepo, clock } = buildDeps();
    subscriptionRepo.findByAcademyId.mockResolvedValue(null);

    const uc = new CreateTrialSubscriptionUseCase(subscriptionRepo, clock);
    const result = await uc.execute('academy-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.trialStartAt).toBe(NOW.toISOString());
      const expectedEnd = new Date(NOW.getTime() + TRIAL_DURATION_DAYS * DAY_MS);
      expect(result.value.trialEndAt).toBe(expectedEnd.toISOString());
    }
    expect(subscriptionRepo.save).toHaveBeenCalled();
  });

  it('should be idempotent — return existing subscription', async () => {
    const { subscriptionRepo, clock } = buildDeps();
    const existing = Subscription.reconstitute('sub-existing', {
      academyId: 'academy-1',
      trialStartAt: new Date('2025-06-01'),
      trialEndAt: new Date('2025-07-01'),
      paidStartAt: null,
      paidEndAt: null,
      tierKey: null,
      pendingTierKey: null,
      pendingTierEffectiveAt: null,
      activeStudentCountSnapshot: null,
      manualNotes: null,
      paymentReference: null,
      audit: createAuditFields(),
    });
    subscriptionRepo.findByAcademyId.mockResolvedValue(existing);

    const uc = new CreateTrialSubscriptionUseCase(subscriptionRepo, clock);
    const result = await uc.execute('academy-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.subscriptionId).toBe('sub-existing');
    }
    expect(subscriptionRepo.save).not.toHaveBeenCalled();
  });
});
