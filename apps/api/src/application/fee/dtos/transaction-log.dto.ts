import type { TransactionLog } from '@domain/fee/entities/transaction-log.entity';
import type { PaidSource } from '@academyflo/contracts';

export interface TransactionLogDto {
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
  createdAt: string;
}

export function toTransactionLogDto(log: TransactionLog): TransactionLogDto {
  return {
    id: log.id.toString(),
    academyId: log.academyId,
    feeDueId: log.feeDueId,
    paymentRequestId: log.paymentRequestId,
    studentId: log.studentId,
    monthKey: log.monthKey,
    amount: log.amount,
    source: log.source,
    collectedByUserId: log.collectedByUserId,
    approvedByUserId: log.approvedByUserId,
    receiptNumber: log.receiptNumber,
    createdAt: log.audit.createdAt.toISOString(),
  };
}
