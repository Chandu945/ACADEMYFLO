import {
  canMarkAttendance,
  canDeclareHoliday,
  canViewAttendance,
  validateLocalDate,
  validateMonthKey,
  validateAttendanceStatus,
  validateHolidayReason,
  validateHolidayDateRange,
  validateDateRange,
} from './attendance.rules';
import { formatLocalDate } from '@shared/date-utils';
import {
  isValidLocalDate,
  isValidMonthKey,
  getDaysInMonth,
  getAllDatesInMonth,
} from '../value-objects/local-date.vo';

describe('canMarkAttendance', () => {
  it('should allow OWNER', () => {
    expect(canMarkAttendance('OWNER').allowed).toBe(true);
  });

  it('should allow STAFF', () => {
    expect(canMarkAttendance('STAFF').allowed).toBe(true);
  });

  it('should reject SUPER_ADMIN', () => {
    expect(canMarkAttendance('SUPER_ADMIN').allowed).toBe(false);
  });
});

describe('canDeclareHoliday', () => {
  it('should allow OWNER', () => {
    expect(canDeclareHoliday('OWNER').allowed).toBe(true);
  });

  it('should reject STAFF', () => {
    const result = canDeclareHoliday('STAFF');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('owners');
  });
});

describe('canViewAttendance', () => {
  it('should allow OWNER', () => {
    expect(canViewAttendance('OWNER').allowed).toBe(true);
  });

  it('should allow STAFF', () => {
    expect(canViewAttendance('STAFF').allowed).toBe(true);
  });

  it('should reject SUPER_ADMIN', () => {
    expect(canViewAttendance('SUPER_ADMIN').allowed).toBe(false);
  });
});

describe('validateLocalDate', () => {
  it('should accept valid date', () => {
    expect(validateLocalDate('2024-03-15').valid).toBe(true);
  });

  it('should reject invalid format', () => {
    expect(validateLocalDate('2024-3-15').valid).toBe(false);
  });

  it('should reject invalid date', () => {
    expect(validateLocalDate('2024-02-30').valid).toBe(false);
  });

  it('should reject non-date string', () => {
    expect(validateLocalDate('not-a-date').valid).toBe(false);
  });
});

describe('validateMonthKey', () => {
  it('should accept valid month', () => {
    expect(validateMonthKey('2024-03').valid).toBe(true);
  });

  it('should reject invalid format', () => {
    expect(validateMonthKey('2024-3').valid).toBe(false);
  });

  it('should reject month 13', () => {
    expect(validateMonthKey('2024-13').valid).toBe(false);
  });
});

describe('validateAttendanceStatus', () => {
  it('should accept PRESENT', () => {
    expect(validateAttendanceStatus('PRESENT').valid).toBe(true);
  });

  it('should accept ABSENT', () => {
    expect(validateAttendanceStatus('ABSENT').valid).toBe(true);
  });

  it('should reject LATE', () => {
    expect(validateAttendanceStatus('LATE').valid).toBe(false);
  });
});

describe('validateHolidayReason', () => {
  it('should accept short reason', () => {
    expect(validateHolidayReason('Republic Day').valid).toBe(true);
  });

  it('should reject reason over 200 chars', () => {
    expect(validateHolidayReason('A'.repeat(201)).valid).toBe(false);
  });
});

describe('LocalDate value object', () => {
  it('should validate correct date', () => {
    expect(isValidLocalDate('2024-01-31')).toBe(true);
  });

  it('should reject Feb 30', () => {
    expect(isValidLocalDate('2024-02-30')).toBe(false);
  });

  it('should accept Feb 29 in leap year', () => {
    expect(isValidLocalDate('2024-02-29')).toBe(true);
  });

  it('should reject Feb 29 in non-leap year', () => {
    expect(isValidLocalDate('2023-02-29')).toBe(false);
  });

  it('should validate month key', () => {
    expect(isValidMonthKey('2024-03')).toBe(true);
    expect(isValidMonthKey('2024-00')).toBe(false);
  });

  it('should get days in month', () => {
    expect(getDaysInMonth('2024-02')).toBe(29); // leap year
    expect(getDaysInMonth('2023-02')).toBe(28);
    expect(getDaysInMonth('2024-03')).toBe(31);
  });

  it('should generate all dates in month', () => {
    const dates = getAllDatesInMonth('2024-02');
    expect(dates).toHaveLength(29);
    expect(dates[0]).toBe('2024-02-01');
    expect(dates[28]).toBe('2024-02-29');
  });
});

describe('validateHolidayDateRange (M2 + L6 fix)', () => {
  // Helper to compute a date N days from today (positive = future, negative = past).
  function dateOffset(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return formatLocalDate(d);
  }

  it('accepts today', () => {
    expect(validateHolidayDateRange(dateOffset(0)).valid).toBe(true);
  });

  it('accepts a date 30 days in the past (boundary)', () => {
    expect(validateHolidayDateRange(dateOffset(-30)).valid).toBe(true);
  });

  it('rejects a date 31 days in the past (just over boundary)', () => {
    const result = validateHolidayDateRange(dateOffset(-31));
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('30 days in the past');
  });

  it('accepts a date 1 year in the future (within window)', () => {
    expect(validateHolidayDateRange(dateOffset(365)).valid).toBe(true);
  });

  it('rejects an obvious year-fat-finger far in the future (e.g., 2046)', () => {
    const result = validateHolidayDateRange('2046-01-26');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('2 years in the future');
  });

  it('rejects an obvious year-fat-finger far in the past (e.g., 1900)', () => {
    const result = validateHolidayDateRange('1900-01-01');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('30 days in the past');
  });
});

describe('L5: date-range rules accept an injected clock for deterministic testing', () => {
  // A fixed clock — `validateDateRange(value, fixedNow)` and
  // `validateHolidayDateRange(value, fixedNow)` produce stable boundary
  // results no matter when the suite runs. Previously these rules read
  // `new Date()` directly, so tests had to compute "today" relative to
  // wall-clock time and any hardcoded date would eventually drift out of
  // the valid window (as the M2 fix discovered with the stale '2024-03-26').
  const fixedNow = new Date('2026-05-12T10:00:00Z');

  describe('validateDateRange with injected clock', () => {
    it('accepts a date exactly 30 days before the fixed clock (boundary)', () => {
      // 2026-05-12 minus 30 days = 2026-04-12
      expect(validateDateRange('2026-04-12', fixedNow).valid).toBe(true);
    });

    it('rejects a date 31 days before the fixed clock (just past boundary)', () => {
      // 2026-05-12 minus 31 days = 2026-04-11
      const result = validateDateRange('2026-04-11', fixedNow);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('30 days in the past');
    });

    it('rejects a date 1 day after the fixed clock (no future)', () => {
      const result = validateDateRange('2026-05-13', fixedNow);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('future');
    });
  });

  describe('validateHolidayDateRange with injected clock', () => {
    it('accepts a date exactly 2 years after the fixed clock (boundary)', () => {
      // 2026-05-12 plus 2 years = 2028-05-12
      expect(validateHolidayDateRange('2028-05-12', fixedNow).valid).toBe(true);
    });

    it('rejects a date 2 years + 1 day after the fixed clock (just past boundary)', () => {
      const result = validateHolidayDateRange('2028-05-13', fixedNow);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('2 years in the future');
    });
  });
});
