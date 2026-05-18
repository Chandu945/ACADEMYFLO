import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { PaymentRequestRepository } from '@domain/fee/ports/payment-request.repository';
import {
  PaymentRequest,
  type PaymentRequestSource,
  type ParentPaymentMethod,
} from '@domain/fee/entities/payment-request.entity';
import { PaymentRequestModel } from '../database/schemas/payment-request.schema';
import type { PaymentRequestDocument } from '../database/schemas/payment-request.schema';
import type { PaymentRequestStatus } from '@academyflo/contracts';
import { getTransactionSession } from '../database/transaction-context';
import { ConcurrentModificationError } from '@shared/errors/concurrent-modification.error';

@Injectable()
export class MongoPaymentRequestRepository implements PaymentRequestRepository {
  constructor(
    @InjectModel(PaymentRequestModel.name)
    private readonly model: Model<PaymentRequestDocument>,
  ) {}

  async save(request: PaymentRequest): Promise<void> {
    const isNew = request.audit.version === 1;
    const filter: Record<string, unknown> = { _id: request.id.toString() };
    if (!isNew) {
      filter['version'] = request.audit.version - 1;
    }

    const result = await this.model.findOneAndUpdate(
      filter,
      {
        _id: request.id.toString(),
        academyId: request.academyId,
        studentId: request.studentId,
        feeDueId: request.feeDueId,
        monthKey: request.monthKey,
        amount: request.amount,
        staffUserId: request.staffUserId,
        staffNotes: request.staffNotes,
        status: request.status,
        reviewedByUserId: request.reviewedByUserId,
        reviewedAt: request.reviewedAt,
        rejectionReason: request.rejectionReason,
        source: request.source,
        paymentMethod: request.paymentMethod,
        proofImageUrl: request.proofImageUrl,
        paymentRefNumber: request.paymentRefNumber,
        version: request.audit.version,
      },
      { upsert: isNew, session: getTransactionSession() },
    );

    if (!result && !isNew) {
      throw new ConcurrentModificationError('PaymentRequest');
    }
  }

  async findById(id: string): Promise<PaymentRequest | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? this.toDomain(doc as unknown as Record<string, unknown>) : null;
  }

  async findPendingByFeeDue(feeDueId: string): Promise<PaymentRequest | null> {
    const doc = await this.model.findOne({ feeDueId, status: 'PENDING' }).lean().exec();
    return doc ? this.toDomain(doc as unknown as Record<string, unknown>) : null;
  }

  async listByAcademyAndStatuses(
    academyId: string,
    statuses: PaymentRequestStatus[],
  ): Promise<PaymentRequest[]> {
    const docs = await this.model
      .find({ academyId, status: { $in: statuses } })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return docs.map((d) => this.toDomain(d as unknown as Record<string, unknown>));
  }

  async listByStaffAndAcademy(staffUserId: string, academyId: string): Promise<PaymentRequest[]> {
    const docs = await this.model
      .find({ staffUserId, academyId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return docs.map((d) => this.toDomain(d as unknown as Record<string, unknown>));
  }

  async listByAcademyAndStudent(academyId: string, studentId: string): Promise<PaymentRequest[]> {
    const docs = await this.model
      .find({ academyId, studentId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return docs.map((d) => this.toDomain(d as unknown as Record<string, unknown>));
  }

  async listPendingByStudentAndAcademy(
    studentId: string,
    academyId: string,
  ): Promise<PaymentRequest[]> {
    // Bounded by (studentId, academyId, status='PENDING') — cap is the small
    // number of in-flight requests a student can have concurrently, which is
    // 1 in practice (per-feeDue partial unique index). Far cheaper than
    // loading the parent's entire PR history just to filter PENDING in JS.
    const docs = await this.model
      .find({ studentId, academyId, status: 'PENDING' })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return docs.map((d) => this.toDomain(d as unknown as Record<string, unknown>));
  }

  async countPendingByAcademy(academyId: string): Promise<number> {
    return this.model.countDocuments({ academyId, status: 'PENDING' });
  }

  async countPendingByStaffAndAcademy(staffUserId: string, academyId: string): Promise<number> {
    return this.model.countDocuments({ staffUserId, academyId, status: 'PENDING' });
  }

  async countPendingByAuthorAndAcademySince(
    authorUserId: string,
    academyId: string,
    since: Date,
  ): Promise<number> {
    return this.model.countDocuments({
      staffUserId: authorUserId,
      academyId,
      status: 'PENDING',
      createdAt: { $gte: since },
    });
  }

  async deleteAllByAcademyAndStudent(academyId: string, studentId: string): Promise<number> {
    const res = await this.model.deleteMany(
      { academyId, studentId },
      { session: getTransactionSession() },
    );
    return res.deletedCount ?? 0;
  }

  async deletePendingByAcademyAndStudent(academyId: string, studentId: string): Promise<number> {
    // M4 fix: cascade for student soft-delete only clears PENDING (in-flight)
    // PRs from the owner's queue. APPROVED/REJECTED/CANCELLED PRs are
    // preserved as immutable history — APPROVED ones are referenced by
    // TransactionLog records, deleting them would leave dangling refs.
    const res = await this.model.deleteMany(
      { academyId, studentId, status: 'PENDING' },
      { session: getTransactionSession() },
    );
    return res.deletedCount ?? 0;
  }

  async cancelPendingByStaffAndAcademy(staffUserId: string, academyId: string): Promise<number> {
    // Staff-deactivate cascade. Soft-cancel (status → CANCELLED) rather than
    // hard-delete so the student's PR history still shows the request and
    // its disposition. The staff record itself stays INACTIVE; the PR rows
    // referencing it remain queryable for audit. Bumps updatedAt so any
    // listing UI ordering by recency reflects the change.
    const res = await this.model.updateMany(
      { staffUserId, academyId, status: 'PENDING' },
      { $set: { status: 'CANCELLED', updatedAt: new Date() } },
      { session: getTransactionSession() },
    );
    return res.modifiedCount ?? 0;
  }

  private toDomain(doc: unknown): PaymentRequest {
    const d = doc as {
      _id: string;
      academyId: string;
      studentId: string;
      feeDueId: string;
      monthKey: string;
      amount: number;
      staffUserId: string;
      staffNotes: string;
      status: PaymentRequestStatus;
      reviewedByUserId: string | null;
      reviewedAt: Date | null;
      rejectionReason: string | null;
      source?: string | null;
      paymentMethod?: string | null;
      proofImageUrl?: string | null;
      paymentRefNumber?: string | null;
      createdAt: Date;
      updatedAt: Date;
      version: number;
    };

    const source: PaymentRequestSource = d.source === 'PARENT' ? 'PARENT' : 'STAFF';
    const method: ParentPaymentMethod | null =
      d.paymentMethod === 'UPI' ||
      d.paymentMethod === 'BANK' ||
      d.paymentMethod === 'CASH' ||
      d.paymentMethod === 'OTHER'
        ? d.paymentMethod
        : null;

    return PaymentRequest.reconstitute(String(d._id), {
      academyId: d.academyId,
      studentId: d.studentId,
      feeDueId: d.feeDueId,
      monthKey: d.monthKey,
      amount: d.amount,
      staffUserId: d.staffUserId,
      staffNotes: d.staffNotes,
      status: d.status,
      reviewedByUserId: d.reviewedByUserId ?? null,
      reviewedAt: d.reviewedAt ?? null,
      rejectionReason: d.rejectionReason ?? null,
      // Legacy records predating Phase 2 default to STAFF / nulls.
      source,
      paymentMethod: method,
      proofImageUrl: d.proofImageUrl ?? null,
      paymentRefNumber: d.paymentRefNumber ?? null,
      audit: {
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        version: d.version ?? 1,
      },
    });
  }
}
