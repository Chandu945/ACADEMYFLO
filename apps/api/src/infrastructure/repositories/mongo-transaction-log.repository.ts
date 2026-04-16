import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { TransactionLogRepository } from '@domain/fee/ports/transaction-log.repository';
import { TransactionLog } from '@domain/fee/entities/transaction-log.entity';
import { TransactionLogModel } from '../database/schemas/transaction-log.schema';
import type { TransactionLogDocument } from '../database/schemas/transaction-log.schema';
import type { PaidSource } from '@playconnect/contracts';
import { getTransactionSession } from '../database/transaction-context';
import { escapeRegex } from '@shared/utils/escape-regex';

@Injectable()
export class MongoTransactionLogRepository implements TransactionLogRepository {
  constructor(
    @InjectModel(TransactionLogModel.name)
    private readonly model: Model<TransactionLogDocument>,
  ) {}

  async save(log: TransactionLog): Promise<void> {
    const doc: Record<string, unknown> = {
      _id: log.id.toString(),
      academyId: log.academyId,
      feeDueId: log.feeDueId,
      studentId: log.studentId,
      source: log.source,
      monthKey: log.monthKey,
      amount: log.amount,
      collectedByUserId: log.collectedByUserId,
      approvedByUserId: log.approvedByUserId,
      receiptNumber: log.receiptNumber,
      version: log.audit.version,
    };

    // Only include paymentRequestId when non-null to avoid sparse unique index conflict
    if (log.paymentRequestId) {
      doc['paymentRequestId'] = log.paymentRequestId;
    }

    await this.model.findOneAndUpdate(
      { _id: log.id.toString() },
      doc,
      { upsert: true, session: getTransactionSession() },
    );
  }

  async findByPaymentRequestId(paymentRequestId: string): Promise<TransactionLog | null> {
    const doc = await this.model.findOne({ paymentRequestId }).lean().exec();
    return doc ? this.toDomain(doc as unknown as Record<string, unknown>) : null;
  }

  async listByAcademy(
    academyId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: TransactionLog[]; total: number }> {
    const skip = (page - 1) * pageSize;
    const [docs, total] = await Promise.all([
      this.model
        .find({ academyId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
      this.model.countDocuments({ academyId }).exec(),
    ]);
    return {
      items: docs.map((d) => this.toDomain(d as unknown as Record<string, unknown>)),
      total,
    };
  }

  async countByAcademyAndPrefix(academyId: string, prefix: string): Promise<number> {
    return this.model.countDocuments({
      academyId,
      receiptNumber: { $regex: `^${escapeRegex(prefix)}-` },
    });
  }

  async incrementReceiptCounter(academyId: string, prefix: string): Promise<number> {
    // Atomic counter using a separate receipt_counters collection.
    // Uses findOneAndUpdate with $inc — guaranteed unique numbers even under
    // concurrent transactions.
    //
    // Note: We do NOT use the transaction session here because:
    // 1. MongoDB Atlas requires primary read preference inside transactions,
    //    but db.collection() inherits secondaryPreferred from the connection.
    // 2. The counter increment is itself atomic (findOneAndUpdate) so it doesn't
    //    need to be inside the outer transaction for correctness.
    // 3. If the outer transaction rolls back, we "waste" one counter value —
    //    this is acceptable (receipt numbers may have gaps but never duplicates).
    const counterId = `${academyId}:${prefix}`;
    const counters = this.model.db.collection<{ _id: string; value: number }>('receipt_counters');

    // First-time seed: if no counter exists, initialize from existing receipt count.
    const existing = await counters.findOne({ _id: counterId });
    if (!existing) {
      const seed = await this.model.countDocuments({
        academyId,
        receiptNumber: { $regex: `^${escapeRegex(prefix)}-` },
      });
      await counters.updateOne(
        { _id: counterId },
        { $setOnInsert: { value: seed } },
        { upsert: true },
      );
    }

    const result = await counters.findOneAndUpdate(
      { _id: counterId },
      { $inc: { value: 1 } },
      { returnDocument: 'after', upsert: true },
    );

    return result?.value ?? 1;
  }

  async sumRevenueByAcademyAndDateRange(academyId: string, from: Date, to: Date): Promise<number> {
    const result = await this.model.aggregate([
      {
        $match: {
          academyId,
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);
    return result.length > 0 ? result[0].total : 0;
  }

  async listByAcademyAndDateRange(
    academyId: string,
    from: Date,
    to: Date,
  ): Promise<TransactionLog[]> {
    const docs = await this.model
      .find({ academyId, createdAt: { $gte: from, $lte: to } })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return docs.map((d) => this.toDomain(d as unknown as Record<string, unknown>));
  }

  async findByFeeDueId(feeDueId: string): Promise<TransactionLog | null> {
    const doc = await this.model.findOne({ feeDueId }).lean().exec();
    return doc ? this.toDomain(doc as unknown as Record<string, unknown>) : null;
  }

  async listByStudentIds(studentIds: string[]): Promise<TransactionLog[]> {
    if (studentIds.length === 0) return [];
    const docs = await this.model
      .find({ studentId: { $in: studentIds } })
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean()
      .exec();
    return docs.map((d) => this.toDomain(d as unknown as Record<string, unknown>));
  }

  async sumRevenueByAcademyGroupedByMonth(
    academyId: string,
    from: Date,
    to: Date,
  ): Promise<{ month: string; total: number }[]> {
    const result = await this.model.aggregate([
      {
        $match: {
          academyId,
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    return result.map((r: { _id: { year: number; month: number }; total: number }) => ({
      month: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
      total: r.total,
    }));
  }

  private toDomain(doc: unknown): TransactionLog {
    const d = doc as {
      _id: string;
      academyId: string;
      feeDueId: string;
      paymentRequestId: string | null;
      studentId: string;
      source: PaidSource;
      monthKey: string;
      amount: number;
      collectedByUserId: string;
      approvedByUserId: string;
      receiptNumber: string;
      createdAt: Date;
      updatedAt: Date;
      version: number;
    };

    return TransactionLog.reconstitute(String(d._id), {
      academyId: d.academyId,
      feeDueId: d.feeDueId,
      paymentRequestId: d.paymentRequestId ?? null,
      studentId: d.studentId,
      source: d.source,
      monthKey: d.monthKey,
      amount: d.amount,
      collectedByUserId: d.collectedByUserId,
      approvedByUserId: d.approvedByUserId,
      receiptNumber: d.receiptNumber,
      audit: {
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        version: d.version ?? 1,
      },
    });
  }
}
