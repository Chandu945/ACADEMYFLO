import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import {
  SubscriptionPaymentModel,
  type SubscriptionPaymentDocument,
} from '../database/schemas/subscription-payment.schema';
import type { Paginated } from '@academyflo/contracts';
import type {
  AdminSubscriptionPaymentReader,
  AdminSubscriptionPaymentFilter,
  AdminSubscriptionPaymentRecord,
  AdminSubscriptionPaymentStatus,
} from '@application/admin/ports/admin-subscription-payment-reader.port';

/**
 * Cross-academy reader for the subscriptionPayments collection. Read-only
 * and admin-scoped — kept separate from the existing payment repository
 * (which is academy-scoped writer + reader for the payment lifecycle).
 */
@Injectable()
export class MongoAdminSubscriptionPaymentReader implements AdminSubscriptionPaymentReader {
  constructor(
    @InjectModel(SubscriptionPaymentModel.name)
    private readonly model: Model<SubscriptionPaymentDocument>,
  ) {}

  async listAll(
    filter: AdminSubscriptionPaymentFilter,
  ): Promise<Paginated<AdminSubscriptionPaymentRecord>> {
    const query: Record<string, unknown> = {};

    if (filter.academyId) query['academyId'] = filter.academyId;
    if (filter.status) query['status'] = filter.status;

    if (filter.from || filter.to) {
      const range: Record<string, Date> = {};
      if (filter.from) range['$gte'] = new Date(`${filter.from}T00:00:00.000Z`);
      if (filter.to) range['$lte'] = new Date(`${filter.to}T23:59:59.999Z`);
      query['createdAt'] = range;
    }

    if (filter.stuckThresholdMinutes !== undefined) {
      const cutoff = new Date(Date.now() - filter.stuckThresholdMinutes * 60_000);
      query['status'] = 'PENDING';
      query['createdAt'] = { ...((query['createdAt'] as object) ?? {}), $lt: cutoff };
    }

    const skip = (filter.page - 1) * filter.pageSize;

    const [docs, totalItems] = await Promise.all([
      this.model
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filter.pageSize)
        .lean()
        .exec(),
      this.model.countDocuments(query).exec(),
    ]);

    const items: AdminSubscriptionPaymentRecord[] = docs.map((d) => {
      const doc = d as unknown as {
        _id: string;
        academyId: string;
        ownerUserId: string;
        orderId: string;
        cfOrderId: string | null;
        tierKey: string;
        amountInr: number;
        currency: string;
        activeStudentCountAtPurchase: number;
        status: string;
        failureReason: string | null;
        paidAt: Date | null;
        providerPaymentId: string | null;
        createdAt: Date;
        updatedAt: Date;
      };
      return {
        id: doc._id,
        academyId: doc.academyId,
        ownerUserId: doc.ownerUserId,
        orderId: doc.orderId,
        cfOrderId: doc.cfOrderId,
        tierKey: doc.tierKey,
        amountInr: doc.amountInr,
        currency: doc.currency,
        activeStudentCountAtPurchase: doc.activeStudentCountAtPurchase,
        status: doc.status as AdminSubscriptionPaymentStatus,
        failureReason: doc.failureReason,
        paidAt: doc.paidAt,
        providerPaymentId: doc.providerPaymentId,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    });

    return {
      items,
      meta: {
        page: filter.page,
        pageSize: filter.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / filter.pageSize),
      },
    };
  }
}
