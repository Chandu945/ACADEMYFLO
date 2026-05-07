import { isEligibleForDue, shouldFlipToDue, computeDueDate } from './fee.rules';

describe('Fee Rules', () => {
  describe('isEligibleForDue', () => {
    // Rule: a student is eligible for a month only if they joined STRICTLY
    // BEFORE that month. Joining any day of the target month skips it.

    it('returns true for ACTIVE student who joined a month earlier', () => {
      const joiningDate = new Date('2024-01-15');
      expect(isEligibleForDue(joiningDate, '2024-03', true, false)).toBe(true);
    });

    it('returns true for student who joined the immediately previous month', () => {
      const joiningDate = new Date('2024-02-28');
      expect(isEligibleForDue(joiningDate, '2024-03', true, false)).toBe(true);
    });

    it('returns true for student who joined a previous calendar year', () => {
      const joiningDate = new Date('2023-11-20');
      expect(isEligibleForDue(joiningDate, '2024-03', true, false)).toBe(true);
    });

    it('returns false for student who joined on the 1st of the target month', () => {
      const joiningDate = new Date('2024-03-01');
      expect(isEligibleForDue(joiningDate, '2024-03', true, false)).toBe(false);
    });

    it('returns false for student who joined mid-month (e.g. 6th) of the target month', () => {
      const joiningDate = new Date('2024-03-06');
      expect(isEligibleForDue(joiningDate, '2024-03', true, false)).toBe(false);
    });

    it('returns false for student who joined on the last day of the target month', () => {
      const joiningDate = new Date('2024-03-31');
      expect(isEligibleForDue(joiningDate, '2024-03', true, false)).toBe(false);
    });

    it('returns false for student joining a future month', () => {
      const joiningDate = new Date('2024-04-01');
      expect(isEligibleForDue(joiningDate, '2024-03', true, false)).toBe(false);
    });

    it('returns false for INACTIVE student even if joining is in the past', () => {
      const joiningDate = new Date('2024-01-01');
      expect(isEligibleForDue(joiningDate, '2024-03', false, false)).toBe(false);
    });

    it('returns false for soft-deleted student', () => {
      const joiningDate = new Date('2024-01-01');
      expect(isEligibleForDue(joiningDate, '2024-03', true, true)).toBe(false);
    });
  });

  describe('shouldFlipToDue', () => {
    it('should return true when todayDay >= dueDateDay', () => {
      expect(shouldFlipToDue(5, 5)).toBe(true);
      expect(shouldFlipToDue(10, 5)).toBe(true);
    });

    it('should return false when todayDay < dueDateDay', () => {
      expect(shouldFlipToDue(3, 5)).toBe(false);
      expect(shouldFlipToDue(1, 5)).toBe(false);
    });
  });

  describe('computeDueDate', () => {
    it('should compute standard due date', () => {
      expect(computeDueDate('2024-03', 5)).toBe('2024-03-05');
    });

    it('should clamp to last day of month for Feb', () => {
      // 2024 is leap year: Feb has 29 days
      expect(computeDueDate('2024-02', 28)).toBe('2024-02-28');
      // Non-leap year: Feb has 28 days
      expect(computeDueDate('2025-02', 28)).toBe('2025-02-28');
    });

    it('should clamp day 28 to 28 for months with 28+ days', () => {
      expect(computeDueDate('2024-01', 28)).toBe('2024-01-28');
    });
  });
});
