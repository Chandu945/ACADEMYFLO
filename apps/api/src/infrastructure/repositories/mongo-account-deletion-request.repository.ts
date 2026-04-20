import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { UserRole } from '@academyflo/contracts';
import type { AccountDeletionRequestRepository } from '@domain/account-deletion/ports/account-deletion-request.repository';
import { AccountDeletionRequest } from '@domain/account-deletion/entities/account-deletion-request.entity';
import type { DeletionStatus } from '@domain/account-deletion/entities/account-deletion-request.entity';
import { AccountDeletionRequestModel } from '../database/schemas/account-deletion-request.schema';
import type { AccountDeletionRequestDocument } from '../database/schemas/account-deletion-request.schema';
import { getTransactionSession } from '../database/transaction-context';

@Injectable()
export class MongoAccountDeletionRequestRepository implements AccountDeletionRequestRepository {
  constructor(
    @InjectModel(AccountDeletionRequestModel.name)
    private readonly model: Model<AccountDeletionRequestDocument>,
  ) {}

  async save(request: AccountDeletionRequest): Promise<void> {
    await this.model.findOneAndUpdate(
      { _id: request.id.toString() },
      {
        _id: request.id.toString(),
        userId: request.userId,
        role: request.role,
        academyId: request.academyId,
        status: request.status,
        reason: request.reason,
        requestedAt: request.requestedAt,
        scheduledExecutionAt: request.scheduledExecutionAt,
        canceledAt: request.canceledAt,
        completedAt: request.completedAt,
        cancelToken: request.cancelToken,
        requestedFromIp: request.requestedFromIp,
        version: request.audit.version,
      },
      { upsert: true, session: getTransactionSession() },
    );
  }

  async findById(id: string): Promise<AccountDeletionRequest | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? this.toDomain(doc as unknown as Record<string, unknown>) : null;
  }

  async findPendingByUserId(userId: string): Promise<AccountDeletionRequest | null> {
    const doc = await this.model.findOne({ userId, status: 'REQUESTED' }).lean().exec();
    return doc ? this.toDomain(doc as unknown as Record<string, unknown>) : null;
  }

  async findByCancelToken(token: string): Promise<AccountDeletionRequest | null> {
    const doc = await this.model.findOne({ cancelToken: token }).lean().exec();
    return doc ? this.toDomain(doc as unknown as Record<string, unknown>) : null;
  }

  async listDue(now: Date, limit: number): Promise<AccountDeletionRequest[]> {
    const docs = await this.model
      .find({ status: 'REQUESTED', scheduledExecutionAt: { $lte: now } })
      .limit(limit)
      .lean()
      .exec();
    return docs.map((d) => this.toDomain(d as unknown as Record<string, unknown>));
  }

  private toDomain(doc: Record<string, unknown>): AccountDeletionRequest {
    return AccountDeletionRequest.reconstitute(doc['_id'] as string, {
      userId: doc['userId'] as string,
      role: doc['role'] as UserRole,
      academyId: (doc['academyId'] as string | null) ?? null,
      status: doc['status'] as DeletionStatus,
      reason: (doc['reason'] as string | null) ?? null,
      requestedAt: doc['requestedAt'] as Date,
      scheduledExecutionAt: doc['scheduledExecutionAt'] as Date,
      canceledAt: (doc['canceledAt'] as Date | null) ?? null,
      completedAt: (doc['completedAt'] as Date | null) ?? null,
      cancelToken: doc['cancelToken'] as string,
      requestedFromIp: (doc['requestedFromIp'] as string | null) ?? null,
      audit: {
        createdAt: (doc['createdAt'] as Date) ?? new Date(),
        updatedAt: (doc['updatedAt'] as Date) ?? new Date(),
        version: (doc['version'] as number) ?? 1,
      },
    });
  }
}
