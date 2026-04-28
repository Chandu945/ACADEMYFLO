import type { TierKey } from '@academyflo/contracts';

export const ADMIN_REVENUE_READER = Symbol('ADMIN_REVENUE_READER');

export interface TierSlice {
  tierKey: TierKey;
  count: number;
  mrrInr: number;
}

export interface CurrentSnapshot {
  /** Number of academies with an actively-running paid subscription right now */
  activePaidCount: number;
  /** Sum of monthly tier prices across all currently-active paid subscriptions */
  mrrInr: number;
  /** ACTIVE_PAID breakdown by tier */
  tierDistribution: TierSlice[];
}

export interface ActivityWindow {
  /** Number of academies whose paid period STARTED in the window */
  newPaidCount: number;
  /** Sum of tier prices for those new paid academies */
  newPaidMrrInr: number;
  /** Number of trials that started in the window */
  trialSignups: number;
  /** Of those trial signups, how many now have an active paid subscription */
  trialConverted: number;
}

export interface AdminRevenueReader {
  /**
   * Current snapshot — "right now" view. Excludes academies with
   * loginDisabled=true (those are administratively suspended and not
   * actively contributing revenue even if dates would otherwise allow it).
   */
  currentSnapshot(now: Date): Promise<CurrentSnapshot>;

  /** Activity in [windowStart, windowEnd) inclusive of start, exclusive of end. */
  activityInWindow(windowStart: Date, windowEnd: Date, now: Date): Promise<ActivityWindow>;

  /** Total trial subscriptions currently active (within trial period, no active paid). */
  activeTrialCount(now: Date): Promise<number>;
}
