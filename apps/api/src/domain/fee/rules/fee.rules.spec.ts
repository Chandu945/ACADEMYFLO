import { isEligibleForDue, shouldFlipToDue, computeDueDate } from './fee.rules';

describe('Fee Rules', () => {
  describe('isEligibleForDue', () => {
    it('should return true for ACTIVE student joined before the month', () => {
      const joiningDate = new Date('2024-01-15');
      expect(isEligibleForDue(joiningDate, '2024-03', true, false)).toBe(true);
    });

    it('should return true for student joined on the 1st of the month', () => {
      const joiningDate = new Date('2024-03-01');
      expect(isEligibleForDue(joiningDate, '2024-03', true, false)).toBe(true);
    });

    it('should return true for student joined on the 15th of the month', () => {
      const joiningDate = new Date('2024-03-15');
      expect(isEligibleForDue(joiningDate, '2024-03', true, false)).toBe(true);
    });

    it('should return false for student joined after the 15th (e.g. 16th)', () => {
      const joiningDate = new Date('2024-03-16');
      expect(isEligibleForDue(joiningDate, '2024-03', true, false)).toBe(false);
    });

    it('should return false for INACTIVE student', () => {
      const joiningDate = new Date('2024-01-01');
      expect(isEligibleForDue(joiningDate, '2024-03', false, false)).toBe(false);
    });

    it('should return false for deleted student', () => {
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
