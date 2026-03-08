import {
  canMarkAttendance,
  canDeclareHoliday,
  canViewAttendance,
  validateLocalDate,
  validateMonthKey,
  validateAttendanceStatus,
  validateHolidayReason,
} from './attendance.rules';
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
