import type { AuditFields } from '@shared/kernel';
import { Entity, UniqueId, createAuditFields } from '@shared/kernel';
import type { PaidSource } from '@playconnect/contracts';

export interface TransactionLogProps {
  academyId: string;
  feeDueId: string;
  paymentRequestId: string | null;
  studentId: string;
  monthKey: string;
  amount: number;
  source: PaidSource;
  collectedByUserId: string;
  approvedByUserId: string;
  receiptNumber: string;
  audit: AuditFields;
}

export class TransactionLog extends Entity<TransactionLogProps> {
  private constructor(id: UniqueId, props: TransactionLogProps) {
    super(id, props);
  }

  static create(params: {
    id: string;
    academyId: string;
    feeDueId: string;
    paymentRequestId: string | null;
    studentId: string;
    monthKey: string;
    amount: number;
    source: PaidSource;
    collectedByUserId: string;
    approvedByUserId: string;
    receiptNumber: string;
  }): TransactionLog {
    return new TransactionLog(new UniqueId(params.id), {
      academyId: params.academyId,
      feeDueId: params.feeDueId,
      paymentRequestId: params.paymentRequestId,
      studentId: params.studentId,
      monthKey: params.monthKey,
      amount: params.amount,
      source: params.source,
      collectedByUserId: params.collectedByUserId,
      approvedByUserId: params.approvedByUserId,
      receiptNumber: params.receiptNumber,
      audit: createAuditFields(),
    });
  }

  static reconstitute(id: string, props: TransactionLogProps): TransactionLog {
    return new TransactionLog(new UniqueId(id), props);
  }

  get academyId(): string {
    return this.props.academyId;
  }

  get feeDueId(): string {
    return this.props.feeDueId;
  }

  get paymentRequestId(): string | null {
    return this.props.paymentRequestId;
  }

  get source(): PaidSource {
    return this.props.source;
  }

  get studentId(): string {
    return this.props.studentId;
  }

  get monthKey(): string {
    return this.props.monthKey;
  }

  get amount(): number {
    return this.props.amount;
  }

  get collectedByUserId(): string {
    return this.props.collectedByUserId;
  }

  get approvedByUserId(): string {
    return this.props.approvedByUserId;
  }

  get receiptNumber(): string {
    return this.props.receiptNumber;
  }

  get audit(): AuditFields {
    return this.props.audit;
  }
}
