import type { AuditActionType, AuditEntityType } from '@playconnect/contracts';

export const AUDIT_RECORDER_PORT = Symbol('AUDIT_RECORDER_PORT');

export interface AuditRecorderPort {
  record(params: {
    academyId: string;
    actorUserId: string;
    action: AuditActionType;
    entityType: AuditEntityType;
    entityId: string;
    context?: Record<string, string>;
  }): Promise<void>;
}
