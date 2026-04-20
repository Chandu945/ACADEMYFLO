import { formatIstDate } from './date-format';

describe('formatIstDate', () => {
  it('returns YYYY-MM-DD for a simple UTC instant', () => {
    expect(formatIstDate(new Date('2026-04-20T12:00:00Z'))).toBe('2026-04-20');
  });

  it('rolls forward to the next IST day when UTC time is past 18:30', () => {
    // 2026-04-20T19:00 UTC = 2026-04-21T00:30 IST — the IST day is the 21st.
    expect(formatIstDate(new Date('2026-04-20T19:00:00Z'))).toBe('2026-04-21');
  });

  it('handles month rollover in IST', () => {
    // 2026-04-30T20:00 UTC = 2026-05-01T01:30 IST — should be May.
    expect(formatIstDate(new Date('2026-04-30T20:00:00Z'))).toBe('2026-05-01');
  });

  it('handles year rollover in IST', () => {
    // 2026-12-31T19:00 UTC = 2027-01-01T00:30 IST
    expect(formatIstDate(new Date('2026-12-31T19:00:00Z'))).toBe('2027-01-01');
  });
});
