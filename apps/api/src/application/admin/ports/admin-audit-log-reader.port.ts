import type { AuditLog } from '@domain/audit/entities/audit-log.entity';
import type { AuditActionType, AuditEntityType, Paginated } from '@academyflo/contracts';

export const ADMIN_AUDIT_LOG_READER = Symbol('ADMIN_AUDIT_LOG_READER');

export interface AdminAuditLogFilter {
  page: number;
  pageSize: number;
  from?: string;
  to?: string;
  action?: AuditActionType;
  entityType?: AuditEntityType;
  academyId?: string;
  actorUserId?: string;
}

export interface AdminAuditLogReader {
  listAll(filter: AdminAuditLogFilter): Promise<Paginated<AuditLog>>;
}
