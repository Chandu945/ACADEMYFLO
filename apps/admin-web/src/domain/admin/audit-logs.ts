import type { AuditActionType, AuditEntityType } from '@academyflo/contracts';

export type { AuditActionType, AuditEntityType };

export type AuditLogActor = {
  userId: string;
  role?: string;
  name: string | null;
};

export type AuditLogEntity = {
  type: AuditEntityType;
  id: string | null;
};

export type AuditLogItem = {
  id: string;
  occurredAt: string;
  actor: AuditLogActor;
  actionType: AuditActionType;
  entity: AuditLogEntity;
  context: Record<string, unknown>;
};

export type AuditLogsQuery = {
  from?: string;
  to?: string;
  actionType?: AuditActionType;
  page: number;
  pageSize: number;
};

export type AuditLogsResult = {
  items: AuditLogItem[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};
