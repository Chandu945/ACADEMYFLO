import type { AuditLog } from '../entities/audit-log.entity';
import type { AuditActionType, AuditEntityType, Paginated } from '@academyflo/contracts';

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
  /**
   * Whether any STUDENT_ATTENDANCE audit entry exists for this (batch, date)
   * within the academy. Used to detect "fresh roll never touched" vs.
   * "edited roll" so the UI can safely auto-fill PRESENT only the first time.
   */
  existsForBatchDate(academyId: string, batchId: string, date: string): Promise<boolean>;
}
