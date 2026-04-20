import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type {
  AdminQueryRepository,
  DashboardTiles,
  AdminAcademiesFilter,
  AcademyListRow,
  AcademyDetail,
} from '@domain/admin/ports/admin-query.repository';
import { AcademyModel } from '../database/schemas/academy.schema';
import type { AcademyDocument } from '../database/schemas/academy.schema';
import { UserModel } from '../database/schemas/user.schema';
import type { UserDocument } from '../database/schemas/user.schema';
import { SubscriptionModel } from '../database/schemas/subscription.schema';
import type { SubscriptionDocument } from '../database/schemas/subscription.schema';
import { StudentModel } from '../database/schemas/student.schema';
import type { StudentDocument } from '../database/schemas/student.schema';
import { TransactionLogModel } from '../database/schemas/transaction-log.schema';
import type { TransactionLogDocument } from '../database/schemas/transaction-log.schema';
import { evaluateSubscriptionStatus } from '@domain/subscription/rules/subscription.rules';
import { Subscription } from '@domain/subscription/entities/subscription.entity';
import type { AdminAcademyStatus, TierKey } from '@academyflo/contracts';

@Injectable()
export class MongoAdminQueryRepository implements AdminQueryRepository {
  constructor(
    @InjectModel(AcademyModel.name) private readonly academyModel: Model<AcademyDocument>,
    @InjectModel(UserModel.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(SubscriptionModel.name) private readonly subModel: Model<SubscriptionDocument>,
    @InjectModel(StudentModel.name) private readonly studentModel: Model<StudentDocument>,
    @InjectModel(TransactionLogModel.name)
    private readonly transactionLogModel: Model<TransactionLogDocument>,
  ) {}

  async getDashboardTiles(now: Date): Promise<DashboardTiles> {
    const academies = await this.academyModel
      .find({ deletedAt: null })
      .select('_id loginDisabled')
      .lean()
      .exec();

    const academyIds = academies.map((a) => String(a._id));
    const subs = await this.subModel
      .find({ academyId: { $in: academyIds } })
      .lean()
      .exec();

    const subByAcademy = new Map(subs.map((s) => [s.academyId, s]));
    const academyMap = new Map(academies.map((a) => [String(a._id), a]));

    let trial = 0;
    let paid = 0;
    let expiredGrace = 0;
    let blocked = 0;
    let disabled = 0;

    for (const academyId of academyIds) {
      const status = this.computeStatus(academyId, academyMap, subByAcademy, now);
      if (status === 'TRIAL') trial++;
      else if (status === 'ACTIVE_PAID') paid++;
      else if (status === 'EXPIRED_GRACE') expiredGrace++;
      else if (status === 'BLOCKED') blocked++;
      else if (status === 'DISABLED') disabled++;
    }

    return {
      totalAcademies: academyIds.length,
      trialAcademies: trial,
      paidAcademies: paid,
      expiredGraceAcademies: expiredGrace,
      blockedAcademies: blocked,
      disabledAcademies: disabled,
    };
  }

  async listAcademies(
    filter: AdminAcademiesFilter,
    now: Date,
  ): Promise<{ items: AcademyListRow[]; total: number }> {
    const academies = await this.academyModel.find({ deletedAt: null }).lean().exec();

    const academyIds = academies.map((a) => String(a._id));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [subs, owners, studentCounts, staffCounts, revenueAgg] = await Promise.all([
      this.subModel
        .find({ academyId: { $in: academyIds } })
        .lean()
        .exec(),
      this.userModel
        .find({ _id: { $in: academies.map((a) => a.ownerUserId) } })
        .lean()
        .exec(),
      this.studentModel
        .aggregate([
          { $match: { academyId: { $in: academyIds }, deletedAt: null, status: 'ACTIVE' } },
          { $group: { _id: '$academyId', count: { $sum: 1 } } },
        ])
        .exec() as Promise<{ _id: string; count: number }[]>,
      this.userModel
        .aggregate([
          { $match: { academyId: { $in: academyIds }, role: 'STAFF', deletedAt: null } },
          { $group: { _id: '$academyId', count: { $sum: 1 } } },
        ])
        .exec() as Promise<{ _id: string; count: number }[]>,
      this.transactionLogModel
        .aggregate([
          {
            $match: {
              academyId: { $in: academyIds },
              createdAt: { $gte: monthStart, $lt: monthEnd },
            },
          },
          { $group: { _id: '$academyId', total: { $sum: '$amount' } } },
        ])
        .exec() as Promise<{ _id: string; total: number }[]>,
    ]);

    const subByAcademy = new Map(subs.map((s) => [s.academyId, s]));
    const ownerById = new Map(owners.map((o) => [String(o._id), o]));
    const academyMap = new Map(academies.map((a) => [String(a._id), a]));
    const studentCountMap = new Map(studentCounts.map((s) => [s._id, s.count]));
    const staffCountMap = new Map(staffCounts.map((s) => [s._id, s.count]));
    const revenueMap = new Map(revenueAgg.map((r) => [r._id, r.total]));

    let rows: AcademyListRow[] = academies.map((a) => {
      const aid = String(a._id);
      const owner = ownerById.get(a.ownerUserId);
      const sub = subByAcademy.get(aid);
      const status = this.computeStatus(aid, academyMap, subByAcademy, now);

      return {
        academyId: aid,
        academyName: a.academyName,
        ownerName: owner?.fullName ?? 'Unknown',
        ownerEmail: owner?.emailNormalized ?? '',
        ownerPhone: owner?.phoneE164 ?? '',
        status,
        tierKey: (sub?.tierKey as TierKey | null) ?? null,
        activeStudentCount: studentCountMap.get(aid) ?? 0,
        staffCount: staffCountMap.get(aid) ?? 0,
        thisMonthRevenueTotal: revenueMap.get(aid) ?? 0,
        createdAt: (a as unknown as { createdAt: Date }).createdAt,
      };
    });

    // Apply filters
    if (filter.status) {
      rows = rows.filter((r) => r.status === filter.status);
    }
    if (filter.tierKey) {
      rows = rows.filter((r) => r.tierKey === filter.tierKey);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.academyName.toLowerCase().includes(q) ||
          r.ownerName.toLowerCase().includes(q) ||
          r.ownerEmail.toLowerCase().includes(q) ||
          r.ownerPhone.includes(q),
      );
    }

    // Sort newest first
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = rows.length;
    const skip = (filter.page - 1) * filter.pageSize;
    const items = rows.slice(skip, skip + filter.pageSize);

    return { items, total };
  }

  async getAcademyDetail(academyId: string, now: Date): Promise<AcademyDetail | null> {
    const academy = await this.academyModel.findById(academyId).lean().exec();
    if (!academy || academy.deletedAt) return null;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [owner, sub, studentCount, staffCount, revenueAgg] = await Promise.all([
      this.userModel.findById(academy.ownerUserId).lean().exec(),
      this.subModel.findOne({ academyId }).lean().exec(),
      this.studentModel.countDocuments({ academyId, deletedAt: null, status: 'ACTIVE' }).exec(),
      this.userModel.countDocuments({ academyId, role: 'STAFF', deletedAt: null }).exec(),
      this.transactionLogModel
        .aggregate([
          {
            $match: {
              academyId,
              createdAt: { $gte: monthStart, $lt: monthEnd },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        .exec(),
    ]);

    const revenueThisMonth = revenueAgg.length > 0 ? (revenueAgg[0] as { total: number }).total : 0;

    if (!owner) return null;

    let subDetail: AcademyDetail['subscription'] = null;
    if (sub) {
      const domainSub = Subscription.reconstitute(String(sub._id), {
        academyId: sub.academyId,
        trialStartAt: sub.trialStartAt,
        trialEndAt: sub.trialEndAt,
        paidStartAt: sub.paidStartAt,
        paidEndAt: sub.paidEndAt,
        tierKey: (sub.tierKey as TierKey | null) ?? null,
        pendingTierKey:
          ((sub as unknown as Record<string, unknown>)['pendingTierKey'] as TierKey | null) ?? null,
        pendingTierEffectiveAt:
          ((sub as unknown as Record<string, unknown>)['pendingTierEffectiveAt'] as Date | null) ??
          null,
        activeStudentCountSnapshot:
          ((sub as unknown as Record<string, unknown>)['activeStudentCountSnapshot'] as
            | number
            | null) ?? null,
        manualNotes: sub.manualNotes ?? null,
        paymentReference:
          (sub as unknown as { paymentReference: string | null }).paymentReference ?? null,
        audit: {
          createdAt: (sub as unknown as { createdAt: Date }).createdAt,
          updatedAt: (sub as unknown as { updatedAt: Date }).updatedAt,
          version: sub.version ?? 1,
        },
      });
      const evaluation = evaluateSubscriptionStatus(now, academy.loginDisabled, domainSub);

      subDetail = {
        id: String(sub._id),
        status: evaluation.status as AdminAcademyStatus,
        trialStartAt: sub.trialStartAt,
        trialEndAt: sub.trialEndAt,
        paidStartAt: sub.paidStartAt,
        paidEndAt: sub.paidEndAt,
        tierKey: (sub.tierKey as TierKey | null) ?? null,
        pendingTierKey:
          ((sub as unknown as Record<string, unknown>)['pendingTierKey'] as TierKey | null) ?? null,
        pendingTierEffectiveAt:
          ((sub as unknown as Record<string, unknown>)['pendingTierEffectiveAt'] as Date | null) ??
          null,
        manualNotes: sub.manualNotes ?? null,
        paymentReference:
          (sub as unknown as { paymentReference: string | null }).paymentReference ?? null,
      };
    }

    return {
      academyId,
      academyName: academy.academyName,
      address: academy.address as AcademyDetail['address'],
      loginDisabled: academy.loginDisabled,
      ownerUserId: String(owner._id),
      ownerName: owner.fullName,
      ownerEmail: owner.emailNormalized,
      ownerPhone: owner.phoneE164,
      ownerProfilePhotoUrl: (owner as unknown as { profilePhotoUrl?: string | null }).profilePhotoUrl ?? null,
      subscription: subDetail,
      studentCount,
      staffCount,
      revenueThisMonth,
      createdAt: (academy as unknown as { createdAt: Date }).createdAt,
    };
  }

  private computeStatus(
    academyId: string,
    academyMap: Map<string, { loginDisabled: boolean }>,
    subByAcademy: Map<
      string,
      {
        academyId: string;
        trialStartAt: Date;
        trialEndAt: Date;
        paidStartAt: Date | null;
        paidEndAt: Date | null;
        tierKey: string | null;
        manualNotes: string | null;
        version: number;
      }
    >,
    now: Date,
  ): AdminAcademyStatus {
    const academy = academyMap.get(academyId);
    const sub = subByAcademy.get(academyId);
    if (!sub) return 'BLOCKED';

    const domainSub = Subscription.reconstitute('temp', {
      academyId: sub.academyId,
      trialStartAt: sub.trialStartAt,
      trialEndAt: sub.trialEndAt,
      paidStartAt: sub.paidStartAt,
      paidEndAt: sub.paidEndAt,
      tierKey: (sub.tierKey as TierKey | null) ?? null,
      pendingTierKey: null,
      pendingTierEffectiveAt: null,
      activeStudentCountSnapshot: null,
      manualNotes: sub.manualNotes ?? null,
      paymentReference: null,
      audit: { createdAt: new Date(), updatedAt: new Date(), version: 1 },
    });

    const evaluation = evaluateSubscriptionStatus(now, academy?.loginDisabled ?? false, domainSub);
    return evaluation.status as AdminAcademyStatus;
  }
}
