import { SetSubscriptionManualUseCase } from './set-subscription-manual.usecase';
import { Subscription } from '@domain/subscription/entities/subscription.entity';
import { createAuditFields } from '@shared/kernel';
import { ConcurrentModificationError } from '@shared/errors/concurrent-modification.error';
import type { SubscriptionRepository } from '@domain/subscription/ports/subscription.repository';

function buildRepo(): jest.Mocked<SubscriptionRepository> {
  return {
    save: jest.fn(),
    findByAcademyId: jest.fn(),
  };
}

function makeSubscription(): Subscription {
  return Subscription.reconstitute('sub-1', {
    academyId: 'academy-1',
    trialStartAt: new Date('2024-01-01'),
    trialEndAt: new Date('2024-01-15'),
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
}

describe('SetSubscriptionManualUseCase (M2: CMC → typed CONFLICT)', () => {
  const baseInput = {
    actorRole: 'SUPER_ADMIN',
    actorUserId: 'admin-1',
    academyId: 'academy-1',
    paidStartAt: '2024-06-01',
    paidEndAt: '2024-07-01',
    tierKey: 'TIER_0_50' as const,
  };

  it('M2: maps ConcurrentModificationError to AdminErrors.concurrencyConflict (CONFLICT)', async () => {
    // The race: two super-admins open the same academy in different tabs,
    // both edit fields, both save. The Mongo CAS filter on `version - 1`
    // catches the loser → ConcurrentModificationError. Pre-fix this
    // bubbled as a 500. Post-fix it surfaces as a typed CONFLICT with a
    // "reload and retry" message so the admin UI can recover cleanly.
    const repo = buildRepo();
    repo.findByAcademyId.mockResolvedValue(makeSubscription());
    repo.save.mockRejectedValueOnce(new ConcurrentModificationError('Subscription'));
    const audit = { record: jest.fn() };

    const uc = new SetSubscriptionManualUseCase(repo, audit);
    const result = await uc.execute(baseInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
      expect(result.error.message).toMatch(/modified by another admin/i);
    }
    // No audit row for the lost-race write — the winner's update already
    // recorded its own audit entry.
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('propagates non-CMC save errors as throws (no swallow)', async () => {
    // Scope the catch tightly. Generic Mongo failures (network, validation)
    // must NOT be converted to CONFLICT — the caller needs to know save
    // failed so it can retry or surface the real error.
    const repo = buildRepo();
    repo.findByAcademyId.mockResolvedValue(makeSubscription());
    repo.save.mockRejectedValueOnce(new Error('mongo timeout'));
    const audit = { record: jest.fn() };

    const uc = new SetSubscriptionManualUseCase(repo, audit);
    await expect(uc.execute(baseInput)).rejects.toThrow(/mongo timeout/);
  });

  it('rejects non-SUPER_ADMIN actors', async () => {
    const repo = buildRepo();
    const audit = { record: jest.fn() };
    const uc = new SetSubscriptionManualUseCase(repo, audit);
    const result = await uc.execute({ ...baseInput, actorRole: 'OWNER' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });
});
