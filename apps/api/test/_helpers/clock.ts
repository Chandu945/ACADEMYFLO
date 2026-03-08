import type { ClockPort } from '../../src/application/common/clock.port';

/**
 * Deterministic clock for tests — defaults to IST-aware fixed date.
 * Use `set()` to change the time during a test, `reset()` to restore.
 */
export class TestClock implements ClockPort {
  private current: Date;
  private readonly defaultDate: Date;

  constructor(initial: Date | string = '2024-03-10T10:00:00+05:30') {
    this.defaultDate = typeof initial === 'string' ? new Date(initial) : initial;
    this.current = this.defaultDate;
  }

  now(): Date {
    return this.current;
  }

  set(date: Date | string): void {
    this.current = typeof date === 'string' ? new Date(date) : date;
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }

  advanceDays(days: number): void {
    this.advance(days * 24 * 60 * 60 * 1000);
  }

  reset(): void {
    this.current = this.defaultDate;
  }
}
