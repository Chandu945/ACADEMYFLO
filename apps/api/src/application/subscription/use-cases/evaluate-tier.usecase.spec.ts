import { EvaluateTierUseCase } from './evaluate-tier.usecase';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';
import type { ActiveStudentCounterPort } from '../ports/active-student-counter.port';
import type { ClockPort } from '../../common/clock.port';
import { Subscription } from '@domain/subscription/entities/subscription.entity';
import { createAuditFields } from '@shared/kernel';

const NOW = new Date('2025-07-15T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function buildDeps() {
  const subscriptionRepo: jest.Mocked<SubscriptionRepository> = {
    save: jest.fn(),
    findByAcademyId: jest.fn(),
  };
  const studentCounter: jest.Mocked<ActiveStudentCounterPort> = {
    countActiveStudents: jest.fn(),
    countEligibleStudents: jest.fn(),
  };
  const clock: ClockPort = { now: () => NOW };
  return { subscriptionRepo, studentCounter, clock };
}

function createSubscription(
  tierKey: 'TIER_0_50' | 'TIER_51_100' | 'TIER_101_PLUS' | null = 'TIER_0_50',
  paidEndAt: Date | null = new Date(NOW.getTime() + 30 * DAY_MS),
): Subscription {
  return Subscription.reconstitute('sub-1', {
    academyId: 'academy-1',
    trialStartAt: new Date(NOW.getTime() - 60 * DAY_MS),
    trialEndAt: new Date(NOW.getTime() - 30 * DAY_MS),
    paidStartAt: new Date(NOW.getTime() - 30 * DAY_MS),
    paidEndAt,
    tierKey,
    pendingTierKey: null,
    pendingTierEffectiveAt: null,
    activeStudentCountSnapshot: null,
    peakStudentCountThisCycle: null,
    manualNotes: null,
    paymentReference: null,
    audit: createAuditFields(),
  });
}

describe('EvaluateTierUseCase', () => {
  it('should return NOT_FOUND when subscription does not exist', async () => {
    const { subscriptionRepo, studentCounter, clock } = buildDeps();
    subscriptionRepo.findByAcademyId.mockResolvedValue(null);

    const uc = new EvaluateTierUseCase(subscriptionRepo, studentCounter, clock);
    const result = await uc.execute('academy-1');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('should compute tier when student count is within current tier', async () => {
    const { subscriptionRepo, studentCounter, clock } = buildDeps();
    subscriptionRepo.findByAcademyId.mockResolvedValue(createSubscription('TIER_0_50'));
    studentCounter.countActiveStudents.mockResolvedValue(30);
    studentCounter.countEligibleStudents.mockResolvedValue(30);

    const uc = new EvaluateTierUseCase(subscriptionRepo, studentCounter, clock);
    const result = await uc.execute('academy-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.activeStudentCount).toBe(30);
      expect(result.value.requiredTierKey).toBe('TIER_0_50');
      expect(result.value.currentTierKey).toBe('TIER_0_50');
      expect(result.value.pendingTierKey).toBeNull();
      expect(result.value.pendingTierEffectiveAt).toBeNull();
    }
  });

  it('should compute pending tier change when upgrade needed', async () => {
    const { subscriptionRepo, studentCounter, clock } = buildDeps();
    const paidEndAt = new Date(NOW.getTime() + 30 * DAY_MS);
    subscriptionRepo.findByAcademyId.mockResolvedValue(createSubscription('TIER_0_50', paidEndAt));
    studentCounter.countActiveStudents.mockResolvedValue(75);
    studentCounter.countEligibleStudents.mockResolvedValue(75);

    const uc = new EvaluateTierUseCase(subscriptionRepo, studentCounter, clock);
    const result = await uc.execute('academy-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.activeStudentCount).toBe(75);
      expect(result.value.requiredTierKey).toBe('TIER_51_100');
      expect(result.value.pendingTierKey).toBe('TIER_51_100');
      expect(result.value.pendingTierEffectiveAt).toEqual(new Date(paidEndAt.getTime() + DAY_MS));
    }
  });

  it('should persist snapshot and pending tier info', async () => {
    const { subscriptionRepo, studentCounter, clock } = buildDeps();
    subscriptionRepo.findByAcademyId.mockResolvedValue(createSubscription('TIER_0_50'));
    studentCounter.countActiveStudents.mockResolvedValue(120);
    studentCounter.countEligibleStudents.mockResolvedValue(120);

    const uc = new EvaluateTierUseCase(subscriptionRepo, studentCounter, clock);
    await uc.execute('academy-1');

    expect(subscriptionRepo.save).toHaveBeenCalledTimes(1);
    const saved = subscriptionRepo.save.mock.calls[0]![0];
    expect(saved.activeStudentCountSnapshot).toBe(120);
    expect(saved.pendingTierKey).toBe('TIER_101_PLUS');
  });

  it('should return no pending change when no paid cycle', async () => {
    const { subscriptionRepo, studentCounter, clock } = buildDeps();
    subscriptionRepo.findByAcademyId.mockResolvedValue(createSubscription('TIER_0_50', null));
    studentCounter.countActiveStudents.mockResolvedValue(75);
    studentCounter.countEligibleStudents.mockResolvedValue(75);

    const uc = new EvaluateTierUseCase(subscriptionRepo, studentCounter, clock);
    const result = await uc.execute('academy-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.requiredTierKey).toBe('TIER_51_100');
      expect(result.value.pendingTierKey).toBeNull();
    }
  });
});
