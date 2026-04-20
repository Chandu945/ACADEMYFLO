import type { AuditLog } from '@domain/audit/entities/audit-log.entity';
import type { AuditActionType, AuditEntityType } from '@academyflo/contracts';

export interface AuditLogDto {
  id: string;
  academyId: string;
  actorUserId: string;
  actorName: string | null;
  action: AuditActionType;
  entityType: AuditEntityType;
  entityId: string;
  context: Record<string, string> | null;
  createdAt: string;
}

export function toAuditLogDto(
  log: AuditLog,
  actorName?: string | null,
): AuditLogDto {
  return {
    id: log.id.toString(),
    academyId: log.academyId,
    actorUserId: log.actorUserId,
    actorName: actorName ?? null,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    context: log.context,
    createdAt: log.createdAt.toISOString(),
  };
}
