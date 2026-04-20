import { toDateOnly, isValidDate } from './date-utils';

describe('toDateOnly', () => {
  it('returns YYYY-MM-DD strings unchanged', () => {
    expect(toDateOnly('2026-04-20')).toBe('2026-04-20');
  });

  it('extracts date portion of ISO datetime', () => {
    expect(toDateOnly('2026-04-20T14:30:00Z')).toBe('2026-04-20');
  });

  it('returns empty for falsy input', () => {
    expect(toDateOnly(null)).toBe('');
    expect(toDateOnly(undefined)).toBe('');
    expect(toDateOnly('')).toBe('');
  });

  it('returns empty for unparseable input', () => {
    expect(toDateOnly('not-a-date')).toBe('');
  });

  it('uses IST (not device TZ) when falling through to Date parser', () => {
    // No 'T' → skips the ISO-split branch; hits the Date-constructor fallback.
    // 20:00 UTC on 2026-04-20 is 2026-04-21 01:30 IST.
    // Pre-fix (getDate on device-local TZ): "2026-04-20" on a UTC machine.
    // Post-fix (Intl with Asia/Kolkata): "2026-04-21" regardless of device TZ.
    expect(toDateOnly('2026-04-20 20:00:00 UTC')).toBe('2026-04-21');
  });
});

describe('isValidDate', () => {
  it('accepts valid dates', () => {
    expect(isValidDate('2026-04-20')).toBe(true);
    expect(isValidDate('2024-02-29')).toBe(true);
  });

  it('rejects invalid dates', () => {
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('not-a-date')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
  });
});
