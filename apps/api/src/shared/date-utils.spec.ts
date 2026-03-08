import { addDaysToLocalDate } from './date-utils';

describe('addDaysToLocalDate', () => {
  it('should add 3 days within a month', () => {
    expect(addDaysToLocalDate('2024-03-05', 3)).toBe('2024-03-08');
  });

  it('should handle month boundary', () => {
    expect(addDaysToLocalDate('2024-01-30', 3)).toBe('2024-02-02');
  });

  it('should handle year boundary', () => {
    expect(addDaysToLocalDate('2024-12-30', 3)).toBe('2025-01-02');
  });

  it('should handle leap year', () => {
    expect(addDaysToLocalDate('2024-02-27', 3)).toBe('2024-03-01');
  });

  it('should handle non-leap year February', () => {
    expect(addDaysToLocalDate('2023-02-27', 3)).toBe('2023-03-02');
  });
});
