import { Entity, UniqueId } from '@shared/kernel';
import type { AuditActionType, AuditEntityType } from '@playconnect/contracts';
import { randomUUID } from 'crypto';

export interface AuditLogProps {
  academyId: string;
  actorUserId: string;
  action: AuditActionType;
  entityType: AuditEntityType;
  entityId: string;
  context: Record<string, string> | null;
  createdAt: Date;
}

export class AuditLog extends Entity<AuditLogProps> {
  static create(params: {
    academyId: string;
    actorUserId: string;
    action: AuditActionType;
    entityType: AuditEntityType;
    entityId: string;
    context?: Record<string, string> | null;
  }): AuditLog {
    return new AuditLog(new UniqueId(randomUUID()), {
      academyId: params.academyId,
      actorUserId: params.actorUserId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      context: params.context ?? null,
      createdAt: new Date(),
    });
  }

  static reconstitute(id: string, props: AuditLogProps): AuditLog {
    return new AuditLog(new UniqueId(id), props);
  }

  get academyId(): string {
    return this.props.academyId;
  }

  get actorUserId(): string {
    return this.props.actorUserId;
  }

  get action(): AuditActionType {
    return this.props.action;
  }

  get entityType(): AuditEntityType {
    return this.props.entityType;
  }

  get entityId(): string {
    return this.props.entityId;
  }

  get context(): Record<string, string> | null {
    return this.props.context;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
