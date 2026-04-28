import type { Result } from '@shared/kernel';
import { ok, err, AppError } from '@shared/kernel';
import { AdminErrors } from '../../common/errors';
import type { AdminRevenueReader, TierSlice } from '../ports/admin-revenue-reader.port';

export interface AdminRevenueDto {
  asOf: string; // ISO timestamp
  /** Currently active paid subscriptions */
  activePaidCount: number;
  /** Monthly recurring revenue (INR) */
  mrrInr: number;
  /** ARR = MRR × 12 (INR) */
  arrInr: number;
  /** Active trials (in trial window, no active paid yet) */
  activeTrialCount: number;
  /** ACTIVE_PAID breakdown by tier */
  tierDistribution: TierSlice[];
  /** This month so far (1st of current month → now, IST) */
  thisMonth: {
    label: string;
    newPaidCount: number;
    newPaidMrrInr: number;
  };
  /** Trial → paid conversion in the last 30 days */
  conversion30d: {
    signups: number;
    converted: number;
    /** 0–1, null if no signups in window */
    rate: number | null;
  };
}

interface Input {
  actorRole: string;
}

export class GetAdminRevenueUseCase {
  constructor(private readonly reader: AdminRevenueReader) {}

  async execute(input: Input): Promise<Result<AdminRevenueDto, AppError>> {
    if (input.actorRole !== 'SUPER_ADMIN') {
      return err(AdminErrors.notSuperAdmin());
    }

    const now = new Date();

    // Compute IST month boundaries — TZ=Asia/Kolkata is the platform contract.
    // We don't want "this month" to flip prematurely for an admin in IST just
    // because UTC has rolled over.
    const monthStart = startOfMonthIST(now);

    const last30dStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [snapshot, monthActivity, last30d, activeTrials] = await Promise.all([
      this.reader.currentSnapshot(now),
      this.reader.activityInWindow(monthStart, now, now),
      this.reader.activityInWindow(last30dStart, now, now),
      this.reader.activeTrialCount(now),
    ]);

    const monthLabel = monthStart.toLocaleString('en-IN', {
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });

    const conversionRate =
      last30d.trialSignups > 0 ? last30d.trialConverted / last30d.trialSignups : null;

    return ok({
      asOf: now.toISOString(),
      activePaidCount: snapshot.activePaidCount,
      mrrInr: snapshot.mrrInr,
      arrInr: snapshot.mrrInr * 12,
      activeTrialCount: activeTrials,
      tierDistribution: snapshot.tierDistribution,
      thisMonth: {
        label: monthLabel,
        newPaidCount: monthActivity.newPaidCount,
        newPaidMrrInr: monthActivity.newPaidMrrInr,
      },
      conversion30d: {
        signups: last30d.trialSignups,
        converted: last30d.trialConverted,
        rate: conversionRate,
      },
    });
  }
}

/**
 * 1st of the current calendar month, midnight IST, returned as a Date.
 * Using UTC math here: IST = UTC+5:30 with no DST, so we compute the IST
 * midnight by subtracting the offset.
 */
function startOfMonthIST(now: Date): Date {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istShifted = new Date(now.getTime() + IST_OFFSET_MS);
  const istYear = istShifted.getUTCFullYear();
  const istMonth = istShifted.getUTCMonth();
  // Midnight on the 1st of istMonth, in IST
  const istMonthStartShifted = Date.UTC(istYear, istMonth, 1, 0, 0, 0);
  // Convert back to actual UTC
  return new Date(istMonthStartShifted - IST_OFFSET_MS);
}
