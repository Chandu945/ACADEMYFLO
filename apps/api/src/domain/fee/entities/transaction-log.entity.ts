import type { AuditFields } from '@shared/kernel';
import { Entity, UniqueId, createAuditFields } from '@shared/kernel';
import type { PaidSource } from '@academyflo/contracts';

export interface TransactionLogProps {
  academyId: string;
  feeDueId: string;
  paymentRequestId: string | null;
  studentId: string;
  monthKey: string;
  /** Total cash collected = baseAmount + lateFeeAmount (when split is set). */
  amount: number;
  /**
   * Principal portion of `amount`. Null on rows created before the split was
   * introduced — readers should fall back to the linked FeeDue.amount.
   */
  baseAmount: number | null;
  /**
   * Late-fee portion of `amount`. Null on legacy rows — fall back to the
   * linked FeeDue.lateFeeApplied. Together baseAmount + lateFeeAmount must
   * equal amount; the approve use-case enforces this invariant at write time.
   */
  lateFeeAmount: number | null;
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
    baseAmount: number;
    lateFeeAmount: number;
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
      baseAmount: params.baseAmount,
      lateFeeAmount: params.lateFeeAmount,
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

  get baseAmount(): number | null {
    return this.props.baseAmount;
  }

  get lateFeeAmount(): number | null {
    return this.props.lateFeeAmount;
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
