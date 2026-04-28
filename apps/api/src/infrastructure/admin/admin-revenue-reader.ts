import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import {
  SubscriptionModel,
  type SubscriptionDocument,
} from '../database/schemas/subscription.schema';
import {
  AcademyModel,
  type AcademyDocument,
} from '../database/schemas/academy.schema';
import { TIER_PRICING_INR, TIER_KEYS, type TierKey } from '@academyflo/contracts';
import type {
  AdminRevenueReader,
  CurrentSnapshot,
  ActivityWindow,
  TierSlice,
} from '@application/admin/ports/admin-revenue-reader.port';

/**
 * Computes revenue / activity metrics by aggregating over the subscriptions
 * collection. Joined to academies on the loginDisabled flag — disabled
 * academies are excluded from "active paid" totals because they're
 * administratively suspended (no platform access = no value delivered).
 *
 * Design notes:
 * - All math happens in JS over a small dataset (one record per academy).
 *   At the current scale (tens of academies), the simplicity is worth more
 *   than aggregation-pipeline cleverness. If the platform crosses ~50k
 *   academies, replace these with `$facet` pipelines.
 * - Disabled-academy filtering is done in JS via a Set lookup, not a
 *   nested $lookup, to keep the read predictable.
 */
@Injectable()
export class MongoAdminRevenueReader implements AdminRevenueReader {
  constructor(
    @InjectModel(SubscriptionModel.name)
    private readonly subModel: Model<SubscriptionDocument>,
    @InjectModel(AcademyModel.name)
    private readonly academyModel: Model<AcademyDocument>,
  ) {}

  async currentSnapshot(now: Date): Promise<CurrentSnapshot> {
    const disabled = await this.disabledAcademyIds();

    const subs = await this.subModel
      .find({
        paidStartAt: { $ne: null, $lte: now },
        paidEndAt: { $ne: null, $gte: now },
        tierKey: { $ne: null },
      })
      .select({ academyId: 1, tierKey: 1 })
      .lean()
      .exec();

    const tierCounts: Record<TierKey, number> = {
      TIER_0_50: 0,
      TIER_51_100: 0,
      TIER_101_PLUS: 0,
    };

    let activePaidCount = 0;
    for (const s of subs as unknown as Array<{ academyId: string; tierKey: TierKey }>) {
      if (disabled.has(s.academyId)) continue;
      tierCounts[s.tierKey]++;
      activePaidCount++;
    }

    const tierDistribution: TierSlice[] = TIER_KEYS.map((t) => ({
      tierKey: t,
      count: tierCounts[t],
      mrrInr: tierCounts[t] * TIER_PRICING_INR[t],
    }));

    const mrrInr = tierDistribution.reduce((sum, slice) => sum + slice.mrrInr, 0);

    return { activePaidCount, mrrInr, tierDistribution };
  }

  async activityInWindow(
    windowStart: Date,
    windowEnd: Date,
    now: Date,
  ): Promise<ActivityWindow> {
    const [newPaidSubs, trialSubs] = await Promise.all([
      this.subModel
        .find({
          paidStartAt: { $gte: windowStart, $lt: windowEnd },
          tierKey: { $ne: null },
        })
        .select({ academyId: 1, tierKey: 1 })
        .lean()
        .exec(),
      this.subModel
        .find({ trialStartAt: { $gte: windowStart, $lt: windowEnd } })
        .select({ academyId: 1, paidStartAt: 1, paidEndAt: 1, tierKey: 1 })
        .lean()
        .exec(),
    ]);

    let newPaidCount = 0;
    let newPaidMrrInr = 0;
    for (const s of newPaidSubs as unknown as Array<{ academyId: string; tierKey: TierKey }>) {
      newPaidCount++;
      newPaidMrrInr += TIER_PRICING_INR[s.tierKey];
    }

    let trialConverted = 0;
    for (const s of trialSubs as unknown as Array<{
      academyId: string;
      paidStartAt: Date | null;
      paidEndAt: Date | null;
      tierKey: TierKey | null;
    }>) {
      // "Converted" = currently has an active paid period (regardless of whether
      // they're still in the very first paid cycle; later renewals also count).
      if (
        s.paidStartAt &&
        s.paidEndAt &&
        s.paidStartAt.getTime() <= now.getTime() &&
        s.paidEndAt.getTime() >= now.getTime() &&
        s.tierKey
      ) {
        trialConverted++;
      }
    }

    return {
      newPaidCount,
      newPaidMrrInr,
      trialSignups: trialSubs.length,
      trialConverted,
    };
  }

  async activeTrialCount(now: Date): Promise<number> {
    const subs = await this.subModel
      .find({
        trialStartAt: { $lte: now },
        trialEndAt: { $gte: now },
      })
      .select({ academyId: 1, paidStartAt: 1, paidEndAt: 1 })
      .lean()
      .exec();

    let count = 0;
    for (const s of subs as unknown as Array<{
      academyId: string;
      paidStartAt: Date | null;
      paidEndAt: Date | null;
    }>) {
      // An academy is "in trial" only if it doesn't *also* have an active paid period.
      const hasActivePaid =
        s.paidStartAt &&
        s.paidEndAt &&
        s.paidStartAt.getTime() <= now.getTime() &&
        s.paidEndAt.getTime() >= now.getTime();
      if (!hasActivePaid) count++;
    }
    return count;
  }

  private async disabledAcademyIds(): Promise<Set<string>> {
    const docs = await this.academyModel
      .find({ loginDisabled: true })
      .select({ _id: 1 })
      .lean()
      .exec();
    return new Set(docs.map((d) => String((d as unknown as { _id: string })._id)));
  }
}
