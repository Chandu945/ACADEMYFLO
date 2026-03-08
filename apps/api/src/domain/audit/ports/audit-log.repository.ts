import type { AuditLog } from '../entities/audit-log.entity';
import type { AuditActionType, AuditEntityType, Paginated } from '@playconnect/contracts';

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

export interface AuditLogFilter {
  page: number;
  pageSize: number;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  action?: AuditActionType;
  entityType?: AuditEntityType;
}

export interface AuditLogRepository {
  save(log: AuditLog): Promise<void>;
  listByAcademy(academyId: string, filter: AuditLogFilter): Promise<Paginated<AuditLog>>;
}
