import type { UserRole } from '@academyflo/contracts';
import type { AuditFields } from '@shared/kernel';
import { Entity, UniqueId, createAuditFields, updateAuditFields } from '@shared/kernel';

export type DeletionStatus = 'REQUESTED' | 'CANCELED' | 'COMPLETED';

export interface AccountDeletionRequestProps {
  userId: string;
  role: UserRole;
  academyId: string | null;
  status: DeletionStatus;
  reason: string | null;
  requestedAt: Date;
  scheduledExecutionAt: Date;
  canceledAt: Date | null;
  completedAt: Date | null;
  cancelToken: string;
  requestedFromIp: string | null;
  audit: AuditFields;
}

export class AccountDeletionRequest extends Entity<AccountDeletionRequestProps> {
  private constructor(id: UniqueId, props: AccountDeletionRequestProps) {
    super(id, props);
  }

  static create(params: {
    id: string;
    userId: string;
    role: UserRole;
    academyId: string | null;
    reason?: string | null;
    coolingOffDays: number;
    cancelToken: string;
    requestedFromIp?: string | null;
    now?: Date;
  }): AccountDeletionRequest {
    if (params.coolingOffDays <= 0 || params.coolingOffDays > 90) {
      throw new Error('coolingOffDays must be between 1 and 90');
    }
    const now = params.now ?? new Date();
    const scheduled = new Date(now.getTime() + params.coolingOffDays * 24 * 60 * 60 * 1000);
    return new AccountDeletionRequest(new UniqueId(params.id), {
      userId: params.userId,
      role: params.role,
      academyId: params.academyId,
      status: 'REQUESTED',
      reason: params.reason ?? null,
      requestedAt: now,
      scheduledExecutionAt: scheduled,
      canceledAt: null,
      completedAt: null,
      cancelToken: params.cancelToken,
      requestedFromIp: params.requestedFromIp ?? null,
      audit: createAuditFields(),
    });
  }

  static reconstitute(id: string, props: AccountDeletionRequestProps): AccountDeletionRequest {
    return new AccountDeletionRequest(new UniqueId(id), props);
  }

  get userId(): string { return this.props.userId; }
  get role(): UserRole { return this.props.role; }
  get academyId(): string | null { return this.props.academyId; }
  get status(): DeletionStatus { return this.props.status; }
  get reason(): string | null { return this.props.reason; }
  get requestedAt(): Date { return this.props.requestedAt; }
  get scheduledExecutionAt(): Date { return this.props.scheduledExecutionAt; }
  get canceledAt(): Date | null { return this.props.canceledAt; }
  get completedAt(): Date | null { return this.props.completedAt; }
  get cancelToken(): string { return this.props.cancelToken; }
  get requestedFromIp(): string | null { return this.props.requestedFromIp; }
  get audit(): AuditFields { return this.props.audit; }

  isPending(now: Date = new Date()): boolean {
    return this.props.status === 'REQUESTED' && this.props.scheduledExecutionAt > now;
  }

  isDue(now: Date = new Date()): boolean {
    return this.props.status === 'REQUESTED' && this.props.scheduledExecutionAt <= now;
  }

  cancel(now: Date = new Date()): void {
    if (this.props.status !== 'REQUESTED') {
      throw new Error(`Cannot cancel deletion in status ${this.props.status}`);
    }
    this.props.status = 'CANCELED';
    this.props.canceledAt = now;
    this.props.audit = updateAuditFields(this.props.audit);
  }

  markCompleted(now: Date = new Date()): void {
    if (this.props.status !== 'REQUESTED') {
      throw new Error(`Cannot complete deletion in status ${this.props.status}`);
    }
    this.props.status = 'COMPLETED';
    this.props.completedAt = now;
    this.props.audit = updateAuditFields(this.props.audit);
  }
}
