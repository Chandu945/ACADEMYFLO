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

  it('M3 fix: maps 11000 unique-index error to idempotent re-fetch (concurrent first-load race)', async () => {
    // get-my-subscription auto-heals by calling createTrial when no
    // subscription exists for an academy. Two concurrent first-load
    // requests both see no subscription and both try to insert. The
    // unique academyId index lets one win — the other gets 11000.
    // Pre-fix: the loser surfaced a generic 500 to the user. Post-fix:
    // we re-fetch and return the winner's subscription as if the call
    // had been a normal idempotent invocation.
    const { subscriptionRepo, clock } = buildDeps();
    // First findByAcademyId (pre-save check) returns null. Save throws
    // 11000. Second findByAcademyId (post-collision) returns the winner.
    const winner = Subscription.reconstitute('sub-winner', {
      academyId: 'academy-1',
      trialStartAt: new Date('2025-06-15'),
      trialEndAt: new Date('2025-07-15'),
      paidStartAt: null,
      paidEndAt: null,
      tierKey: null,
      pendingTierKey: null,
      pendingTierEffectiveAt: null,
      activeStudentCountSnapshot: null,
      peakStudentCountThisCycle: null,
      manualNotes: null,
      paymentReference: null,
      audit: createAuditFields(),
    });
    subscriptionRepo.findByAcademyId
      .mockResolvedValueOnce(null) // initial check
      .mockResolvedValueOnce(winner); // post-collision re-fetch
    subscriptionRepo.save.mockRejectedValueOnce(
      Object.assign(new Error('E11000 duplicate key'), { code: 11000 }),
    );

    const uc = new CreateTrialSubscriptionUseCase(subscriptionRepo, clock);
    const result = await uc.execute('academy-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.subscriptionId).toBe('sub-winner');
    }
  });

  it('propagates non-11000 save errors as throws (no swallow)', async () => {
    // The 11000-handling is scoped to the duplicate-index case. A generic
    // mongo error (network, validation, etc.) should not be silently
    // converted to a successful return — the caller needs to know save
    // failed so it can retry or surface the error.
    const { subscriptionRepo, clock } = buildDeps();
    subscriptionRepo.findByAcademyId.mockResolvedValue(null);
    subscriptionRepo.save.mockRejectedValue(new Error('mongo timeout'));

    const uc = new CreateTrialSubscriptionUseCase(subscriptionRepo, clock);
    await expect(uc.execute('academy-1')).rejects.toThrow(/mongo timeout/);
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
      peakStudentCountThisCycle: null,
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
