import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AuditLogModel } from '../database/schemas/audit-log.schema';
import type { AuditLogDocument } from '../database/schemas/audit-log.schema';
import { AuditLog } from '@domain/audit/entities/audit-log.entity';
import type { AuditActionType, AuditEntityType, Paginated } from '@academyflo/contracts';
import type {
  AdminAuditLogReader,
  AdminAuditLogFilter,
} from '@application/admin/ports/admin-audit-log-reader.port';

/**
 * Cross-academy audit log reader for super-admin views.
 *
 * Reads from the same `audit_logs` collection as MongoAuditLogRepository but
 * is intentionally a separate adapter — kept apart so the per-academy port
 * stays academyId-scoped (the safer default for tenant code) while admin
 * tooling has explicit, opt-in cross-tenant access here.
 */
@Injectable()
export class MongoAdminAuditLogReader implements AdminAuditLogReader {
  constructor(@InjectModel(AuditLogModel.name) private readonly model: Model<AuditLogDocument>) {}

  async listAll(filter: AdminAuditLogFilter): Promise<Paginated<AuditLog>> {
    const query: Record<string, unknown> = {};

    if (filter.academyId) query['academyId'] = filter.academyId;
    if (filter.actorUserId) query['actorUserId'] = filter.actorUserId;
    if (filter.action) query['action'] = filter.action;
    if (filter.entityType) query['entityType'] = filter.entityType;

    if (filter.from || filter.to) {
      const range: Record<string, Date> = {};
      if (filter.from) range['$gte'] = new Date(`${filter.from}T00:00:00.000Z`);
      if (filter.to) range['$lte'] = new Date(`${filter.to}T23:59:59.999Z`);
      query['createdAt'] = range;
    }

    const skip = (filter.page - 1) * filter.pageSize;

    const [docs, totalItems] = await Promise.all([
      this.model.find(query).sort({ createdAt: -1 }).skip(skip).limit(filter.pageSize).lean().exec(),
      this.model.countDocuments(query).exec(),
    ]);

    const items = docs.map((d) => this.toDomain(d as unknown as Record<string, unknown>));
    const totalPages = Math.ceil(totalItems / filter.pageSize);

    return {
      items,
      meta: { page: filter.page, pageSize: filter.pageSize, totalItems, totalPages },
    };
  }

  private toDomain(doc: unknown): AuditLog {
    const d = doc as {
      _id: string;
      academyId: string;
      actorUserId: string;
      action: string;
      entityType: string;
      entityId: string;
      context: Record<string, string> | null;
      createdAt: Date;
    };
    return AuditLog.reconstitute(String(d._id), {
      academyId: d.academyId,
      actorUserId: d.actorUserId,
      action: d.action as AuditActionType,
      entityType: d.entityType as AuditEntityType,
      entityId: d.entityId,
      context: d.context,
      createdAt: d.createdAt,
    });
  }
}
