import { FeeDue } from './fee-due.entity';
import type { LateFeeConfig } from '@academyflo/contracts';

describe('FeeDue', () => {
  function makeDue() {
    return FeeDue.create({
      id: 'due-1',
      academyId: 'academy-1',
      studentId: 's1',
      monthKey: '2024-03',
      dueDate: '2024-03-05',
      amount: 500,
    });
  }

  const snapshot: LateFeeConfig = {
    lateFeeEnabled: true,
    gracePeriodDays: 5,
    lateFeeAmountInr: 100,
    lateFeeRepeatIntervalDays: 5,
  };

  describe('revertToDue', () => {
    it('preserves lateFeeConfigSnapshot (H1 invariant)', () => {
      // H1: the snapshot represents the rate that was locked when the fee
      // first became DUE. Reverting from PAID back to DUE doesn't invalidate
      // that lock — the fee is still the same fee, the rate is still the
      // rate that applied. If we nulled it here, the cron's legacy-backfill
      // loop would re-snapshot using the current live config and silently
      // retroactively re-price the fee.
      const due = makeDue().flipToDue().snapshotLateFeeConfig(snapshot);
      expect(due.lateFeeConfigSnapshot).toEqual(snapshot);

      const paid = due.markPaid('owner-1', new Date('2024-03-12T00:00:00Z'));
      expect(paid.status).toBe('PAID');

      const reverted = paid.revertToDue();
      expect(reverted.status).toBe('DUE');
      // The snapshot survives the round-trip.
      expect(reverted.lateFeeConfigSnapshot).toEqual(snapshot);
    });

    it('clears paid-fields on revert', () => {
      // Defense in depth: the other revert fields still get reset so a
      // future "refund" caller gets a clean DUE record (no stale paidAt,
      // paidByUserId, etc. clinging to it).
      const paid = makeDue().flipToDue().markPaid('owner-1', new Date('2024-03-12T00:00:00Z'));

      const reverted = paid.revertToDue();
      expect(reverted.status).toBe('DUE');
      expect(reverted.paidAt).toBeNull();
      expect(reverted.paidByUserId).toBeNull();
      expect(reverted.paidSource).toBeNull();
      expect(reverted.paymentLabel).toBeNull();
      expect(reverted.collectedByUserId).toBeNull();
      expect(reverted.approvedByUserId).toBeNull();
      expect(reverted.paymentRequestId).toBeNull();
      expect(reverted.lateFeeApplied).toBeNull();
    });
  });
});
